import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleAccounts } from '@/db/schema';
import { logActivity } from '@/lib/activity';
import { decryptSecret } from '@/lib/encryption';
import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = withAuth<Ctx>(async (user, _req, ctx) => {
  const { id } = await ctx.params;
  const [row] = await db
    .select()
    .from(googleAccounts)
    .where(and(eq(googleAccounts.id, id), eq(googleAccounts.userId, user.id)));
  if (!row) throw new AppError('NOT_FOUND', 'Akun tidak ditemukan.', 404);

  try {
    const refreshToken = decryptSecret(row.refreshTokenEncrypted);
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, { method: 'POST' });
  } catch {
    // revoke gagal tidak menghalangi penghapusan lokal
  }

  await db
    .delete(googleAccounts)
    .where(and(eq(googleAccounts.id, id), eq(googleAccounts.userId, user.id)));
  await logActivity({
    userId: user.id,
    action: 'account.disconnect',
    metadata: { email: row.email },
  });
  return ok({ deleted: true });
});
