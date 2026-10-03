import { logActivity } from '@/lib/activity';
import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';

export const POST = withAuth(async (user, req) => {
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
