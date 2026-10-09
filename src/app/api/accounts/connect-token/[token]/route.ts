import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { accountConnectTokens } from '@/db/schema';
import { ok } from '@/lib/http';

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const row = await db.query.accountConnectTokens.findFirst({
    where: eq(accountConnectTokens.token, token),
  });

  if (!row) {
    return ok({ valid: false, reason: 'not_found' });
  }

  if (row.status === 'completed') {
    return ok({ valid: false, reason: 'already_used', connectedEmail: row.connectedEmail });
  }

  if (row.status === 'expired' || row.expiresAt.getTime() <= Date.now()) {
    return ok({ valid: false, reason: 'expired' });
  }

  return ok({
    valid: true,
    expiresAt: row.expiresAt.toISOString(),
  });
}
