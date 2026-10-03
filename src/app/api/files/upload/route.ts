import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { googleAccounts, uploadJobs } from '@/db/schema';
import { logActivity } from '@/lib/activity';
import { AppError } from '@/lib/errors';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { withAuth } from '@/lib/http';
import { syncQuota } from '@/lib/quota';
import { rateLimit } from '@/lib/rate-limit';
import { selectAccount } from '@/lib/upload/select-account';

export const POST = withAuth(async (user, req) => {
  const limit = rateLimit(`upload:${user.id}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Batas 10 upload/menit tercapai.' } },
      { status: 429, headers: { 'retry-after': String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }

  const sp = req.nextUrl.searchParams;
  const mode = sp.get('mode') ?? 'manual';
  const accountId = sp.get('accountId');
  const filename = sp.get('filename');
  const parentId = sp.get('parentId') ?? undefined;
  const contentLength = Number(req.headers.get('content-length') ?? 0);

  if (mode !== 'manual' && mode !== 'auto') {
    throw new AppError('VALIDATION', 'mode harus auto atau manual.', 400);
  }
  if (!filename || !contentLength) {
    throw new AppError('VALIDATION', 'filename dan content-length wajib.', 400);
  }
  if (mode === 'manual' && !accountId) {
    throw new AppError('VALIDATION', 'accountId, filename, dan content-length wajib.', 400);
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
      contentLength,
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
    if (quota.freeBytes != null && quota.freeBytes < contentLength) {
      throw new AppError('QUOTA_EXCEEDED', `Ruang ${account.email} tidak cukup.`, 413);
    }
  }

  const [job] = await db
    .insert(uploadJobs)
    .values({
      userId: user.id,
      googleAccountId: account.id,
      filename,
      fileSize: contentLength,
      status: 'uploading',
    })
    .returning();

  try {
    const service = await GoogleDriveService.forAccount(account);
    const file = await service.uploadFile({
      stream: req.body!,
      contentLength,
      contentType: req.headers.get('content-type') ?? 'application/octet-stream',
      filename,
      parentId,
    });

    await db
      .update(uploadJobs)
      .set({ status: 'completed', completedAt: new Date() })
      .where(and(eq(uploadJobs.id, job!.id), eq(uploadJobs.userId, user.id)));
    await syncQuota(account);
    await logActivity({
      userId: user.id,
      googleAccountId: account.id,
      action: 'file.upload',
      fileId: file.id,
      metadata: { filename, sizeBytes: contentLength },
    });

    return NextResponse.json({ file, jobId: job!.id }, { status: 201 });
  } catch (error) {
    await db
      .update(uploadJobs)
      .set({ status: 'failed', errorMessage: error instanceof Error ? error.message : 'unknown' })
      .where(and(eq(uploadJobs.id, job!.id), eq(uploadJobs.userId, user.id)));
    throw error instanceof AppError ? error : new AppError('UPLOAD_FAILED', 'Upload gagal.', 502);
  }
});
