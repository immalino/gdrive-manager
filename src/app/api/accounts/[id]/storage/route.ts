import { getAccountForUser } from '@/lib/google/tokens';
import { ok, withAuth } from '@/lib/http';
import { recentSnapshots } from '@/lib/quota';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  await getAccountForUser(user.id, id);
  const snapshots = await recentSnapshots(id, 60);
  return ok({ snapshots });
});
