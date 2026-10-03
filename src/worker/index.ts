import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleAccounts, sharedRoots } from '@/db/schema';
import { syncQuota } from '@/lib/quota';
import { checkAccountHealth } from '@/lib/google/health';
import { indexAccountFiles } from '@/lib/google-drive/indexer';

export const QUOTA_INTERVAL_MS = 10 * 60_000;
export const HEALTH_INTERVAL_MS = 30 * 60_000;
export const INDEX_INTERVAL_MS = 60 * 60_000;

export async function safe(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    console.error(`[worker] ${label} gagal`, error instanceof Error ? error.message : error);
  }
}

export async function syncAllQuota() {
  const accounts = await db.select().from(googleAccounts);
  for (const account of accounts) {
    await safe(`quota ${account.email}`, async () => {
      await syncQuota(account);
    });
  }
  console.log(`[worker] quota sync selesai untuk ${accounts.length} akun`);
}

export async function healthAll() {
  const accounts = await db.select().from(googleAccounts);
  for (const account of accounts) {
    const status = await checkAccountHealth(account);
    if (status !== 'connected') console.warn(`[worker] ${account.email} → ${status}`);
  }
}

export async function indexAll() {
  const accounts = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.status, 'connected'));
  for (const account of accounts) {
    await safe(`index ${account.email}`, async () => {
      let sharedRootId: string | undefined;
      try {
        const root = await db.query?.sharedRoots?.findFirst({
          where: eq(sharedRoots.userId, account.userId),
        });
        sharedRootId = root?.driveFolderId;
      } catch {
        // ignore
      }
      const count = await indexAccountFiles(account, sharedRootId);
      console.log(`[worker] ${account.email}: ${count} file terindeks`);
    });
  }
}

async function startWorker() {
  console.log('[worker] mulai — quota 10m, health 30m, index 60m');
  await syncAllQuota();
  await healthAll();
  await indexAll();

  if (process.argv.includes('--once')) {
    console.log('[worker] selesai (--once mode)');
    process.exit(0);
  } else {
    setInterval(() => safe('quota loop', syncAllQuota), QUOTA_INTERVAL_MS);
    setInterval(() => safe('health loop', healthAll), HEALTH_INTERVAL_MS);
    setInterval(() => safe('index loop', indexAll), INDEX_INTERVAL_MS);
  }
}

if (!process.env.VITEST) {
  startWorker().catch((err) => {
    console.error('[worker] fatal error', err);
    process.exit(1);
  });
}
