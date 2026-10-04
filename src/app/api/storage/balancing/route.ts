import { db } from '@/db';
import { driveFiles, googleAccounts } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { ok, withAuth } from '@/lib/http';
import { latestSnapshot } from '@/lib/quota';
import { calculateStorageImbalance, getBalancingRecommendations } from '@/lib/storage/balancing';

export const GET = withAuth(async (user) => {
  const accounts = await db
    .select()
    .from(googleAccounts)
    .where(and(eq(googleAccounts.userId, user.id), eq(googleAccounts.status, 'connected')));

  const perAccount = await Promise.all(
    accounts.map(async (account) => {
      const snapshot = await latestSnapshot(account.id);
      return {
        id: account.id,
        email: account.email,
        usedBytes: snapshot?.usedBytes ?? 0,
        totalBytes: snapshot?.totalBytes ?? null,
        isUploadEnabled: account.isUploadEnabled,
      };
    }),
  );

  const accountIds = accounts.map((a) => a.id);
  const files =
    accountIds.length > 0
      ? await db
          .select({
            id: driveFiles.driveFileId,
            name: driveFiles.name,
            sizeBytes: driveFiles.sizeBytes,
            accountId: driveFiles.googleAccountId,
            mimeType: driveFiles.mimeType,
            parentId: driveFiles.parentId,
          })
          .from(driveFiles)
          .where(inArray(driveFiles.googleAccountId, accountIds))
      : [];

  const imbalance = calculateStorageImbalance(perAccount);
  const recommendations = getBalancingRecommendations(perAccount, files);

  return ok({
    ...imbalance,
    recommendations,
  });
});
