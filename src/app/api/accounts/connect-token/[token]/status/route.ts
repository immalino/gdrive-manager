import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { accountConnectTokens } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';

type Ctx = { params: Promise<{ token: string }> };

export const GET = withAuth<Ctx>(async (user, _req, ctx) => {
  const { token } = await ctx.params;
  const row = await db.query.accountConnectTokens.findFirst({
    where: and(eq(accountConnectTokens.token, token), eq(accountConnectTokens.userId, user.id)),
  });

  if (!row) {
    throw new AppError('NOT_FOUND', 'Token tidak ditemukan.', 404);
  }

  const isExpired = row.status !== 'completed' && row.expiresAt.getTime() <= Date.now();
  const status = isExpired ? 'expired' : row.status;

  return ok({
    id: row.id,
    token: row.token,
    status,
    connectedEmail: row.connectedEmail ?? null,
    expiresAt: row.expiresAt.toISOString(),
  });
});
