import { logActivity } from '@/lib/activity';
import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { rateLimit } from '@/lib/rate-limit';

export const POST = withAuth(async (user, req) => {
  const limit = rateLimit(`mutate:${user.id}`, 30, 60_000);
  if (!limit.ok)
    throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    accountId?: string;
    parentId?: string;
  } | null;
  const name = body?.name;
  const accountId = body?.accountId;
  const parentId = body?.parentId;
  if (!name?.trim() || !accountId) {
    throw new AppError('VALIDATION', 'name dan accountId wajib.', 400);
  }
  const account = await getAccountForUser(user.id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  const folder = await service.createFolder(name.trim(), parentId);
  await logActivity({
    userId: user.id,
    googleAccountId: account.id,
    action: 'folder.create',
    fileId: folder.id,
    metadata: { name: folder.name },
  });
  return ok({ folder }, 201);
});

export const GET = withAuth(async (user, req) => {
  const accountId = req.nextUrl.searchParams.get('accountId');
  const parentId = req.nextUrl.searchParams.get('parentId') ?? undefined;
  const search = req.nextUrl.searchParams.get('search') ?? undefined;
  if (!accountId) throw new AppError('VALIDATION', 'accountId wajib.', 400);
  const account = await getAccountForUser(user.id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  const folders = await service.listFolders(parentId, search);
  return ok({
    folders: folders.map((f) => ({ ...f, accountId: account.id, accountEmail: account.email })),
  });
});
