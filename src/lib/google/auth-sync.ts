import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleAccounts, sharedRoots, user, type GoogleAccount } from '@/db/schema';
import { encryptSecret } from '@/lib/encryption';
import { logActivity } from '@/lib/activity';

export interface BetterAuthAccountInput {
  id?: string;
  userId: string;
  accountId: string; // Google sub ID
  providerId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  accessTokenExpiresAt?: Date | null;
}

/**
 * Sinkronisasi akun Google dari Better Auth ke tabel googleAccounts.
 * Jika akun baru atau user belum memiliki akun utama, jadikan sebagai 'primary'
 * dan otomatis inisialisasi folder root bersama (GDrive Pool).
 */
export async function syncGoogleAccountFromAuth(
  account: BetterAuthAccountInput,
): Promise<GoogleAccount | null> {
  if (account.providerId !== 'google') {
    return null;
  }

  // 1. Ambil data user dari DB
  const u = await db.query.user.findFirst({
    where: eq(user.id, account.userId),
  });
  if (!u) {
    console.warn(`[auth-sync] User tidak ditemukan untuk id: ${account.userId}`);
    return null;
  }

  // 2. Cek apakah akun Google ini sudah ada di tabel googleAccounts
  const existingAccount = await db.query.googleAccounts.findFirst({
    where: and(
      eq(googleAccounts.userId, account.userId),
      eq(googleAccounts.googleAccountId, account.accountId),
    ),
  });

  // 3. Cek apakah user sudah memiliki akun primary
  const existingPrimary = await db.query.googleAccounts.findFirst({
    where: and(eq(googleAccounts.userId, account.userId), eq(googleAccounts.role, 'primary')),
  });

  let targetAccount: GoogleAccount;

  if (existingAccount) {
    const updateValues: Partial<typeof googleAccounts.$inferInsert> = {
      name: u.name ?? existingAccount.name,
      picture: u.image ?? existingAccount.picture,
      status: 'connected',
      updatedAt: new Date(),
    };

    if (account.accessToken) {
      updateValues.accessToken = encryptSecret(account.accessToken);
    }
    if (account.refreshToken) {
      updateValues.refreshTokenEncrypted = encryptSecret(account.refreshToken);
    }
    if (account.accessTokenExpiresAt) {
      updateValues.tokenExpiresAt = account.accessTokenExpiresAt;
    }
    // Jika user belum punya akun utama sama sekali, jadikan akun ini sebagai primary
    if (!existingPrimary) {
      updateValues.role = 'primary';
    }

    const [updated] = await db
      .update(googleAccounts)
      .set(updateValues)
      .where(eq(googleAccounts.id, existingAccount.id))
      .returning();
    targetAccount = updated!;
  } else {
    // Akun baru: otomatis jadikan primary jika belum ada akun primary
    const isPrimary = !existingPrimary;

    const [inserted] = await db
      .insert(googleAccounts)
      .values({
        userId: account.userId,
        googleAccountId: account.accountId,
        email: u.email,
        name: u.name ?? null,
        picture: u.image ?? null,
        accessToken: encryptSecret(account.accessToken || ''),
        refreshTokenEncrypted: encryptSecret(account.refreshToken || ''),
        tokenExpiresAt: account.accessTokenExpiresAt ?? null,
        status: 'connected',
        role: isPrimary ? 'primary' : 'pool',
      })
      .returning();
    targetAccount = inserted!;

    await logActivity({
      userId: account.userId,
      googleAccountId: targetAccount.id,
      action: 'account.connect',
      metadata: {
        email: targetAccount.email,
        role: targetAccount.role,
        autoPrimary: isPrimary,
      },
    });
  }

  // 4. Sinkronisasi kuota storage dari Google Drive API
  try {
    const { syncQuota } = await import('@/lib/quota');
    await syncQuota(targetAccount);
  } catch (err) {
    console.warn(
      '[auth-sync] Sinkronisasi kuota gagal:',
      err instanceof Error ? err.message : err,
    );
  }

  // 5. Jika akun ini adalah primary, pastikan Shared Root diinisialisasi secara otomatis
  if (targetAccount.role === 'primary') {
    const existingRoot = await db.query.sharedRoots.findFirst({
      where: eq(sharedRoots.userId, account.userId),
    });

    if (!existingRoot) {
      try {
        const { initSharedRoot } = await import('@/lib/shared-drive/setup');
        await initSharedRoot({
          userId: account.userId,
          primaryAccountId: targetAccount.id,
          folderName: 'GDrive Pool',
        });
        console.log(`[auth-sync] Otomatis membuat Shared Root untuk user ${account.userId}`);
      } catch (initErr) {
        console.error(
          '[auth-sync] Gagal membuat Shared Root otomatis:',
          initErr instanceof Error ? initErr.message : initErr,
        );
      }
    }
  }

  return targetAccount;
}

