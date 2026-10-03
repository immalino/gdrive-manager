import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { driveFiles } from '@/db/schema';
import { logActivity } from '@/lib/activity';
import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { rateLimit } from '@/lib/rate-limit';
import { getSetupStatus } from '@/lib/shared-drive/setup';

export const POST = withAuth(async (user, req) => {
  const limit = rateLimit(`mutate:${user.id}`, 30, 60_000);
  if (!limit.ok)
    throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    accountId?: string;
    parentId?: string;
    parentFolderId?: string;
  } | null;

  const name = body?.name;
  const parentFolderId = body?.parentFolderId ?? body?.parentId;

  if (!name?.trim()) {
    throw new AppError('VALIDATION', 'name wajib.', 400);
  }

  const setupStatus = await getSetupStatus(user.id);
  let targetAccount = setupStatus.primaryAccount;
  let targetParentId = parentFolderId;

  if (setupStatus.sharedRoot) {
    if (!targetParentId) {
      targetParentId = setupStatus.sharedRoot.driveFolderId;
    }
  }

  if (!targetAccount) {
    if (body?.accountId) {
      targetAccount = await getAccountForUser(user.id, body.accountId);
    } else {
      throw new AppError(
        'VALIDATION',
        'Setup shared drive belum selesai atau akun utama tidak ditemukan.',
        400,
      );
    }
  }

  const service = await GoogleDriveService.forAccount(targetAccount);
  const folder = await service.createFolder(name.trim(), targetParentId);

  try {
    const insertBuilder = db.insert(driveFiles).values({
      googleAccountId: targetAccount.id,
      driveFileId: folder.id,
      name: folder.name,
      mimeType: folder.mimeType,
      kind: 'folder',
      sizeBytes: null,
      modifiedAt: folder.modifiedAt ? new Date(folder.modifiedAt) : null,
      parentId: targetParentId ?? null,
      indexedAt: new Date(),
    });
    if (
      'onConflictDoUpdate' in insertBuilder &&
      typeof (insertBuilder as { onConflictDoUpdate?: unknown }).onConflictDoUpdate === 'function'
    ) {
      await (
        insertBuilder as {
          onConflictDoUpdate: (opts: unknown) => Promise<unknown>;
        }
      ).onConflictDoUpdate({
        target: [driveFiles.googleAccountId, driveFiles.driveFileId],
        set: {
          name: sql`excluded.name`,
          parentId: sql`excluded.parent_id`,
          indexedAt: sql`excluded.indexed_at`,
        },
      });
    }
  } catch (cacheErr) {
    console.warn('[POST /api/folders] Caching folder to driveFiles failed:', cacheErr);
  }

  await logActivity({
    userId: user.id,
    googleAccountId: targetAccount.id,
    action: 'folder.create',
    fileId: folder.id,
    metadata: { name: folder.name, parentId: targetParentId },
  });

  return ok({ folder }, 201);
});

export const GET = withAuth(async (user, req) => {
  const accountIdParam = req.nextUrl.searchParams.get('accountId');
  const parentIdParam =
    req.nextUrl.searchParams.get('parentId') ??
    req.nextUrl.searchParams.get('parentFolderId') ??
    undefined;
  const search = req.nextUrl.searchParams.get('search') ?? undefined;

  let account;
  const setupStatus = await getSetupStatus(user.id);

  if (accountIdParam) {
    account = await getAccountForUser(user.id, accountIdParam);
  } else if (setupStatus.primaryAccount) {
    account = setupStatus.primaryAccount;
  } else {
    throw new AppError('VALIDATION', 'accountId wajib.', 400);
  }

  let parentId = parentIdParam;
  if (
    !parentId &&
    setupStatus.sharedRoot &&
    (!accountIdParam || accountIdParam === setupStatus.primaryAccount?.id)
  ) {
    parentId = setupStatus.sharedRoot.driveFolderId;
  }

  const service = await GoogleDriveService.forAccount(account);
  const folders = await service.listFolders(parentId, search);
  return ok({
    folders: folders.map((f) => ({ ...f, accountId: account.id, accountEmail: account.email })),
  });
});
