import { AppError } from '@/lib/errors';
import { withAuth } from '@/lib/http';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const accountId = req.nextUrl.searchParams.get('accountId');
  if (!accountId) throw new AppError('VALIDATION', 'accountId wajib.', 400);
  const account = await getAccountForUser(user.id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  const res = await service.downloadFile(id);
  return res;
});
