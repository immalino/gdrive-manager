import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { activityLogs, googleAccounts } from '@/db/schema';
import { ok, withAuth } from '@/lib/http';

export const GET = withAuth(async (user, req) => {
  const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? 20);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 20;
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
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(Math.min(limit, 100));

  return ok({
    activity: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});
