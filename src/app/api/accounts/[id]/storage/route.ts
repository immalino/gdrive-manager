import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { storageSnapshots } from '@/db/schema';
import { getAccountForUser } from '@/lib/google/tokens';
import { ok, withAuth } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  await getAccountForUser(user.id, id);
  const rows = await db
    .select()
    .from(storageSnapshots)
    .where(eq(storageSnapshots.googleAccountId, id))
    .orderBy(desc(storageSnapshots.createdAt))
    .limit(60);
  return ok({ snapshots: rows });
});
