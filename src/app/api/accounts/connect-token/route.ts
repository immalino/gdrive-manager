import { randomBytes } from 'node:crypto';
import { db } from '@/db';
import { accountConnectTokens } from '@/db/schema';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit/distributed';

export const POST = withAuth(async (user, req) => {
  const limit = await rateLimit(`connect_token:${user.id}`, 10, 5 * 60_000);
  if (!limit.ok) {
    throw new AppError(
      'RATE_LIMITED',
      'Terlalu banyak permintaan pembuatan link. Coba lagi dalam beberapa menit.',
      429,
    );
  }

  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

  const [created] = await db
    .insert(accountConnectTokens)
    .values({
      token,
      userId: user.id,
      status: 'pending',
      expiresAt,
    })
    .returning();

  const origin = req ? new URL(req.url).origin : env.APP_URL;
  const url = `${origin}/connect/${created.token}`;

  return ok({
    id: created.id,
    token: created.token,
    url,
    expiresAt: created.expiresAt.toISOString(),
  });
});
