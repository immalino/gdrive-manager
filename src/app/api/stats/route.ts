import { desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { activityLogs, driveFiles, googleAccounts, storageSnapshots } from '@/db/schema';
import { ok, withAuth } from '@/lib/http';
import { latestSnapshot } from '@/lib/quota';
import { calculateTotals } from '@/lib/stats';

export const GET = withAuth(async (user) => {
  const accounts = await db.select().from(googleAccounts).where(eq(googleAccounts.userId, user.id));
  const accountIds = accounts.map((a) => a.id);

  const recentActions = await db
    .select({ action: activityLogs.action, count: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(eq(activityLogs.userId, user.id))
    .groupBy(activityLogs.action);

  if (accountIds.length === 0) {
    return ok({
      totals: calculateTotals([], 0),
      fileKinds: [],
      snapshotHistory: [],
      actionCounts: recentActions.map((a) => ({
        action: a.action,
        count: Number(a.count),
      })),
    });
  }

  const snapshots = await Promise.all(accountIds.map((id) => latestSnapshot(id)));

  const byKind = await db
    .select({
      kind: driveFiles.kind,
      count: sql<number>`count(*)::int`,
      totalSize: sql<number>`coalesce(sum(${driveFiles.sizeBytes}), 0)::text`,
    })
    .from(driveFiles)
    .where(inArray(driveFiles.googleAccountId, accountIds))
    .groupBy(driveFiles.kind);

  const history = await db
    .select()
    .from(storageSnapshots)
    .where(inArray(storageSnapshots.googleAccountId, accountIds))
    .orderBy(desc(storageSnapshots.createdAt))
    .limit(60);

  return ok({
    totals: calculateTotals(snapshots, accounts.length),
    fileKinds: byKind.map((k) => ({
      kind: k.kind,
      count: Number(k.count),
      totalSize: Number(k.totalSize),
    })),
    snapshotHistory: history.reverse().map((h) => ({
      id: h.id,
      googleAccountId: h.googleAccountId,
      totalBytes: h.totalBytes,
      usedBytes: h.usedBytes,
      freeBytes: h.freeBytes,
      createdAt: h.createdAt instanceof Date ? h.createdAt.toISOString() : String(h.createdAt),
    })),
    actionCounts: recentActions.map((a) => ({
      action: a.action,
      count: Number(a.count),
    })),
  });
});
