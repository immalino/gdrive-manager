import { db } from '@/db';
import { googleAccounts, sharedRoots } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit/distributed';
import { shareRootToAccount } from '@/lib/shared-drive/permissions';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ accountId: string }> };

export const POST = withAuth<Ctx>(async (user, _req, ctx) => {
  const limit = await rateLimit(`mutate:${user.id}`, 30, 60_000);
  if (!limit.ok) {
    throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);
  }

  const { accountId } = await ctx.params;

  const sharedRoot = await db.query.sharedRoots.findFirst({
    where: eq(sharedRoots.userId, user.id),
  });
  if (!sharedRoot) {
    throw new AppError('NOT_FOUND', 'Shared root belum di-setup.', 404);
  }

  const primaryAccount = await db.query.googleAccounts.findFirst({
    where: and(
      eq(googleAccounts.id, sharedRoot.primaryAccountId),
      eq(googleAccounts.userId, user.id),
    ),
  });
  if (!primaryAccount) {
    throw new AppError('NOT_FOUND', 'Akun primary tidak ditemukan.', 404);
  }

  const poolAccount = await db.query.googleAccounts.findFirst({
    where: and(eq(googleAccounts.id, accountId), eq(googleAccounts.userId, user.id)),
  });
  if (!poolAccount) {
    throw new AppError('NOT_FOUND', 'Akun pool tidak ditemukan.', 404);
  }

  if (poolAccount.id === primaryAccount.id) {
    throw new AppError('VALIDATION', 'Akun ini adalah akun utama.', 400);
  }

  const permission = await shareRootToAccount(
    sharedRoot.id,
    sharedRoot.driveFolderId,
    primaryAccount,
    poolAccount,
  );

  await logActivity({
    userId: user.id,
    googleAccountId: poolAccount.id,
    action: 'setup.share',
    metadata: {
      folderId: sharedRoot.driveFolderId,
      permissionId: permission.drivePermissionId,
      poolEmail: poolAccount.email,
    },
  });

  return ok({ shared: true, permission });
});
