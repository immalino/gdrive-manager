import { logActivity } from '@/lib/activity';
import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { rateLimit } from '@/lib/rate-limit';

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth<Ctx>(async (user, req, ctx) => {
  const limit = rateLimit(`mutate:${user.id}`, 30, 60_000);
  if (!limit.ok)
    throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);
  const { id } = await ctx.params;
  const accountId = req.nextUrl.searchParams.get('accountId');
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    folderId?: string;
  };
  const { name, folderId } = body;
  if (!accountId || !name?.trim())
    throw new AppError('VALIDATION', 'accountId dan name wajib.', 400);
  const account = await getAccountForUser(user.id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  const copy = await service.copyFile(id, name.trim(), folderId);
  await logActivity({
    userId: user.id,
    googleAccountId: account.id,
    action: 'file.copy',
    fileId: copy.id,
    metadata: { sourceFileId: id, name: copy.name },
  });
  return ok({ file: copy }, 201);
});
