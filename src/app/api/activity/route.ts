import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { activityLogs, googleAccounts } from '@/db/schema';
import { getAccountForUser } from '@/lib/google/tokens';
import { ok, withAuth } from '@/lib/http';

export const GET = withAuth(async (user, req) => {
  const sp = req.nextUrl.searchParams;
  const action = sp.get('action');
  const accountId = sp.get('accountId');
  const page = Math.max(Number(sp.get('page') ?? 1), 1);
  const pageSizeParam = sp.get('pageSize') ?? sp.get('limit') ?? 20;
  const pageSize = Math.min(Math.max(Number(pageSizeParam), 1), 100);

  const conditions = [eq(activityLogs.userId, user.id)];
  if (action && action !== 'all') {
    conditions.push(eq(activityLogs.action, action));
  }
  if (accountId && accountId !== 'all') {
    await getAccountForUser(user.id, accountId);
    conditions.push(eq(activityLogs.googleAccountId, accountId));
  }

  const where = and(...conditions);
  const rows = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      fileId: activityLogs.fileId,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt,
      email: googleAccounts.email,
    })
    .from(activityLogs)
    .leftJoin(googleAccounts, eq(activityLogs.googleAccountId, googleAccounts.id))
    .where(where)
    .orderBy(desc(activityLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return ok({
    activity: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    })),
    page,
    pageSize,
  });
});
