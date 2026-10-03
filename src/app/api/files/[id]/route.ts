import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { driveFiles, googleAccounts, type GoogleAccount } from '@/db/schema';
import { logActivity } from '@/lib/activity';
import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { rateLimit } from '@/lib/rate-limit';
import { getSetupStatus } from '@/lib/shared-drive/setup';

type Ctx = { params: Promise<{ id: string }> };

export async function resolveFileAccount(
  userId: string,
  fileId: string,
  accountIdParam?: string | null,
): Promise<GoogleAccount> {
  if (accountIdParam) {
    return await getAccountForUser(userId, accountIdParam);
  }
  const record = await db
    .select({ account: googleAccounts })
    .from(driveFiles)
    .innerJoin(googleAccounts, eq(driveFiles.googleAccountId, googleAccounts.id))
    .where(and(eq(driveFiles.driveFileId, fileId), eq(googleAccounts.userId, userId)))
    .limit(1);
  if (record.length > 0) {
    return record[0].account;
  }
  const setupStatus = await getSetupStatus(userId);
  if (setupStatus.primaryAccount) {
    return setupStatus.primaryAccount;
  }
  const first = await db.query.googleAccounts.findFirst({
    where: eq(googleAccounts.userId, userId),
  });
  if (first) return first;
  throw new AppError('NOT_FOUND', 'Akun tidak ditemukan untuk file ini.', 404);
}

export const DELETE = withAuth<Ctx>(async (user, req, ctx) => {
  const limit = rateLimit(`mutate:${user.id}`, 30, 60_000);
  if (!limit.ok)
    throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);
  const { id } = await ctx.params;
  const accountId = req.nextUrl.searchParams.get('accountId');
  const account = await resolveFileAccount(user.id, id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  await service.deleteFile(id);
  await db.delete(driveFiles).where(eq(driveFiles.driveFileId, id));
  await logActivity({
    userId: user.id,
    googleAccountId: account.id,
    action: 'file.delete',
    fileId: id,
  });
  return ok({ deleted: true });
});

export const PATCH = withAuth<Ctx>(async (user, req, ctx) => {
  const limit = rateLimit(`mutate:${user.id}`, 30, 60_000);
  if (!limit.ok)
    throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);
  const { id } = await ctx.params;
  const accountId = req.nextUrl.searchParams.get('accountId');
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    folderId?: string | null;
    fromFolderId?: string | null;
  };
  if (!body.name?.trim() && body.folderId === undefined) {
    throw new AppError('VALIDATION', 'name atau folderId wajib diisi.', 400);
  }
  const account = await resolveFileAccount(user.id, id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  const setupStatus = await getSetupStatus(user.id);

  if (body.name?.trim()) {
    await service.renameFile(id, body.name.trim());
    await db
      .update(driveFiles)
      .set({ name: body.name.trim() })
      .where(eq(driveFiles.driveFileId, id));
    await logActivity({
      userId: user.id,
      googleAccountId: account.id,
      action: 'file.rename',
      fileId: id,
      metadata: { name: body.name.trim() },
    });
  }
  if (body.folderId !== undefined) {
    let destFolderId = body.folderId;
    if (setupStatus.sharedRoot && (destFolderId === 'root' || destFolderId === null)) {
      destFolderId = setupStatus.sharedRoot.driveFolderId;
    }
    await service.moveFile(id, body.fromFolderId ?? null, destFolderId);
    await db
      .update(driveFiles)
      .set({ parentId: destFolderId })
      .where(eq(driveFiles.driveFileId, id));
    await logActivity({
      userId: user.id,
      googleAccountId: account.id,
      action: 'file.move',
      fileId: id,
      metadata: { to: destFolderId },
    });
  }
  return ok({ updated: true });
});
