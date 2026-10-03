import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  googleAccounts,
  storageSnapshots,
  type GoogleAccount,
  type StorageSnapshot,
} from '@/db/schema';
import { GoogleDriveService } from '@/lib/google-drive/service';

export async function syncQuota(account: GoogleAccount): Promise<StorageSnapshot> {
  const service = await GoogleDriveService.forAccount(account);
  const quota = await service.getStorageQuota();
  const [snapshot] = await db
    .insert(storageSnapshots)
    .values({
      googleAccountId: account.id,
      totalBytes: quota.totalBytes,
      usedBytes: quota.usedBytes,
      freeBytes: quota.freeBytes,
    })
    .returning();
  return snapshot!;
}

export async function syncAllQuotas(userId: string): Promise<number> {
  const accounts = await db.select().from(googleAccounts).where(eq(googleAccounts.userId, userId));
  let synced = 0;
  for (const account of accounts) {
    try {
      await syncQuota(account);
      synced += 1;
    } catch (error) {
      console.warn(
        `[quota] gagal sync ${account.email}`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return synced;
}

export async function latestSnapshot(accountId: string): Promise<StorageSnapshot | null> {
  const [row] = await db
    .select()
    .from(storageSnapshots)
    .where(eq(storageSnapshots.googleAccountId, accountId))
    .orderBy(desc(storageSnapshots.createdAt))
    .limit(1);
  return row ?? null;
}

export async function recentSnapshots(accountId: string, limit = 60): Promise<StorageSnapshot[]> {
  return db
    .select()
    .from(storageSnapshots)
    .where(eq(storageSnapshots.googleAccountId, accountId))
    .orderBy(desc(storageSnapshots.createdAt))
    .limit(limit);
}
