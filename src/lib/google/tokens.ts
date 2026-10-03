import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleAccounts, type GoogleAccount } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { decryptSecret, encryptSecret } from '@/lib/encryption';
import { refreshAccessToken } from '@/lib/google/oauth';

const EXPIRY_MARGIN_MS = 60_000;

export async function getValidAccessToken(account: GoogleAccount): Promise<string> {
  const expiresAt = account.tokenExpiresAt?.getTime() ?? 0;
  if (expiresAt > Date.now() + EXPIRY_MARGIN_MS) {
    return decryptSecret(account.accessToken);
  }

  try {
    const tokens = await refreshAccessToken(decryptSecret(account.refreshTokenEncrypted));
    const next: Partial<GoogleAccount> = {
      accessToken: encryptSecret(tokens.access_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      status: 'connected',
      updatedAt: new Date(),
    };
    if (tokens.refresh_token) next.refreshTokenEncrypted = encryptSecret(tokens.refresh_token);
    const [updated] = await db
      .update(googleAccounts)
      .set(next)
      .where(eq(googleAccounts.id, account.id))
      .returning();
    return decryptSecret(updated!.accessToken);
  } catch {
    await db
      .update(googleAccounts)
      .set({ status: 'reconnect_required', updatedAt: new Date() })
      .where(eq(googleAccounts.id, account.id));
    throw new AppError(
      'ACCOUNT_DISCONNECTED',
      'Token Google kedaluwarsa. Silakan hubungkan ulang akun.',
      401,
    );
  }
}

export async function getAccountForUser(userId: string, accountId: string): Promise<GoogleAccount> {
  const [row] = await db
    .select()
    .from(googleAccounts)
    .where(and(eq(googleAccounts.id, accountId), eq(googleAccounts.userId, userId)));
  if (!row) throw new AppError('NOT_FOUND', 'Akun tidak ditemukan.', 404);
  return row;
}
