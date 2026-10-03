import { logActivity } from '@/lib/activity';
import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { rateLimit } from '@/lib/rate-limit';

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = withAuth<Ctx>(async (user, req, ctx) => {
  const limit = rateLimit(`mutate:${user.id}`, 30, 60_000);
  if (!limit.ok)
    throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);
  const { id } = await ctx.params;
  const accountId = req.nextUrl.searchParams.get('accountId');
  if (!accountId) throw new AppError('VALIDATION', 'accountId wajib.', 400);
  const account = await getAccountForUser(user.id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  await service.deleteFile(id);
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
  if (!accountId) throw new AppError('VALIDATION', 'accountId wajib.', 400);
  if (!body.name?.trim() && body.folderId === undefined) {
    throw new AppError('VALIDATION', 'name atau folderId wajib diisi.', 400);
  }
  const account = await getAccountForUser(user.id, accountId);
  const service = await GoogleDriveService.forAccount(account);

  if (body.name?.trim()) {
    await service.renameFile(id, body.name.trim());
    await logActivity({
      userId: user.id,
      googleAccountId: account.id,
      action: 'file.rename',
      fileId: id,
      metadata: { name: body.name.trim() },
    });
  }
  if (body.folderId !== undefined) {
    await service.moveFile(id, body.fromFolderId ?? null, body.folderId);
    await logActivity({
      userId: user.id,
      googleAccountId: account.id,
      action: 'file.move',
      fileId: id,
      metadata: { to: body.folderId },
    });
  }
  return ok({ updated: true });
});
