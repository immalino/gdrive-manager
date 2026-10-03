import { logActivity } from '@/lib/activity';
import { withAuth } from '@/lib/http';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { resolveFileAccount } from '../route';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const accountId = req.nextUrl.searchParams.get('accountId');
  const account = await resolveFileAccount(user.id, id, accountId);
  const service = await GoogleDriveService.forAccount(account);
  const res = await service.downloadFile(id);
  await logActivity({
    userId: user.id,
    googleAccountId: account.id,
    action: 'file.download',
    fileId: id,
  });
  return res;
});
