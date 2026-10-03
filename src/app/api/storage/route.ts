import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleAccounts } from '@/db/schema';
import { ok, withAuth } from '@/lib/http';
import { latestSnapshot } from '@/lib/quota';

export const GET = withAuth(async (user) => {
  const accounts = await db.select().from(googleAccounts).where(eq(googleAccounts.userId, user.id));
  const perAccount = await Promise.all(
    accounts.map(async (account) => ({ account, snapshot: await latestSnapshot(account.id) })),
  );

  const totalBytes = perAccount.reduce((sum, r) => sum + (r.snapshot?.totalBytes ?? 0), 0);
  const usedBytes = perAccount.reduce((sum, r) => sum + (r.snapshot?.usedBytes ?? 0), 0);
  const anyUnknownLimit = perAccount.some((r) => r.snapshot?.totalBytes == null);

  return ok({
    totals: {
      totalBytes: anyUnknownLimit ? null : totalBytes,
      usedBytes,
      freeBytes: anyUnknownLimit ? null : Math.max(totalBytes - usedBytes, 0),
      accountCount: perAccount.length,
    },
    accounts: perAccount.map(({ account, snapshot }) => ({
      id: account.id,
      email: account.email,
      name: account.name,
      picture: account.picture,
      status: account.status,
      totalBytes: snapshot?.totalBytes ?? null,
      usedBytes: snapshot?.usedBytes ?? 0,
      freeBytes: snapshot?.freeBytes ?? null,
      snapshotAt: snapshot?.createdAt ?? null,
    })),
  });
});
