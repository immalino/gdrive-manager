import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { googleAccounts, uploadJobs } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { ok, withAuth } from '@/lib/http';
import { syncQuota } from '@/lib/quota';
import { rateLimit } from '@/lib/rate-limit';
import { getSetupStatus } from '@/lib/shared-drive/setup';
import { isSubfolderOfSharedRoot } from '@/lib/shared-drive/validation';
import { selectAccount } from '@/lib/upload/select-account';

export const POST = withAuth(async (user, req) => {
  const limit = rateLimit(`upload:${user.id}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Batas 10 upload/menit tercapai.' } },
      { status: 429, headers: { 'retry-after': String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    filename?: string;
    fileSize?: number;
    contentType?: string;
    accountId?: string;
    folderId?: string;
    parentFolderId?: string;
    mode?: 'auto' | 'manual';
  } | null;

  if (!body) {
    throw new AppError('VALIDATION', 'Request body JSON tidak valid.', 400);
  }

  const { filename, fileSize, contentType } = body;
  const mode = body.mode ?? (body.accountId ? 'manual' : 'auto');
  const accountId = body.accountId;
  const parentFolderIdParam = body.parentFolderId ?? body.folderId ?? undefined;

  if (mode !== 'manual' && mode !== 'auto') {
    throw new AppError('VALIDATION', 'mode harus auto atau manual.', 400);
  }
  if (!filename || typeof fileSize !== 'number' || fileSize <= 0) {
    throw new AppError('VALIDATION', 'filename dan fileSize (> 0) wajib.', 400);
  }
  if (mode === 'manual' && !accountId) {
    throw new AppError('VALIDATION', 'accountId wajib untuk mode manual.', 400);
  }

  const setupStatus = await getSetupStatus(user.id);
  const targetFolderId = parentFolderIdParam || setupStatus.sharedRoot?.driveFolderId;

  if (
    parentFolderIdParam &&
    setupStatus.sharedRoot &&
    parentFolderIdParam !== setupStatus.sharedRoot.driveFolderId
  ) {
    const primaryService = setupStatus.primaryAccount
      ? await GoogleDriveService.forAccount(setupStatus.primaryAccount)
      : null;
    if (primaryService) {
      const isValid = await isSubfolderOfSharedRoot(
        primaryService,
        setupStatus.sharedRoot.driveFolderId,
        parentFolderIdParam,
      );
      if (!isValid) {
        throw new AppError('VALIDATION', 'parentFolderId bukan subfolder dari shared root.', 400);
      }
    }
  }

  let resolvedAccountId = accountId;

  if (mode === 'auto') {
    const accounts = await db
      .select()
      .from(googleAccounts)
      .where(eq(googleAccounts.userId, user.id));
    const quotas = await Promise.all(
      accounts.map(async (a) => {
        try {
          return { id: a.id, email: a.email, quota: await syncQuota(a) };
        } catch {
          return { id: a.id, email: a.email, quota: { freeBytes: null } };
        }
      }),
    );
    const picked = selectAccount(
      fileSize,
      quotas.map((q) => ({ id: q.id, email: q.email, freeBytes: q.quota.freeBytes })),
    );
    if (!picked) {
      throw new AppError(
        'QUOTA_EXCEEDED',
        'Tidak ada akun dengan ruang cukup untuk file ini.',
        413,
      );
    }
    resolvedAccountId = picked.id;
  }

  const account = await getAccountForUser(user.id, resolvedAccountId!);

  if (mode === 'manual') {
    const quota = await syncQuota(account);
    if (quota.freeBytes != null && quota.freeBytes < fileSize) {
      throw new AppError('QUOTA_EXCEEDED', `Ruang ${account.email} tidak cukup.`, 413);
    }
  }

  const [job] = await db
    .insert(uploadJobs)
    .values({
      userId: user.id,
      googleAccountId: account.id,
      filename,
      fileSize,
      status: 'uploading',
      uploadedBytes: 0,
    })
    .returning();

  try {
    const service = await GoogleDriveService.forAccount(account);
    const sessionUri = await service.initiateResumableSession({
      filename,
      mimeType: contentType || 'application/octet-stream',
      fileSize,
      parentId: targetFolderId || undefined,
    });

    await db
      .update(uploadJobs)
      .set({ resumableUri: sessionUri })
      .where(and(eq(uploadJobs.id, job.id), eq(uploadJobs.userId, user.id)));

    return ok({ jobId: job.id, accountId: account.id, sessionUri }, 201);
  } catch (error) {
    await db
      .update(uploadJobs)
      .set({ status: 'failed', errorMessage: error instanceof Error ? error.message : 'unknown' })
      .where(and(eq(uploadJobs.id, job.id), eq(uploadJobs.userId, user.id)));
    throw error instanceof AppError
      ? error
      : new AppError('UPLOAD_FAILED', 'Gagal inisiasi sesi upload.', 502);
  }
});
