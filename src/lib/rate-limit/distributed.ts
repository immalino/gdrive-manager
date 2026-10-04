import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { db } from '@/db';
import { rateLimits } from '@/db/schema';

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs: number;
}

export async function distributedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = new Date(),
): Promise<RateLimitResult> {
  const windowStart = new Date(now.getTime() - windowMs);

  const hits = await db
    .select({ id: rateLimits.id, timestamp: rateLimits.timestamp })
    .from(rateLimits)
    .where(and(eq(rateLimits.key, key), gte(rateLimits.timestamp, windowStart)))
    .orderBy(asc(rateLimits.timestamp));

  if (hits.length >= limit) {
    const oldestTs = hits[0].timestamp.getTime();
    const retryAfterMs = Math.max(1000, windowMs - (now.getTime() - oldestTs));
    return { ok: false, retryAfterMs };
  }

  await db.insert(rateLimits).values({
    key,
    timestamp: now,
  });

  // Prune expired records asynchronously
  const cutoff = new Date(now.getTime() - windowMs * 2);
  db.delete(rateLimits)
    .where(and(eq(rateLimits.key, key), lt(rateLimits.timestamp, cutoff)))
    .catch(() => {});

  return { ok: true, retryAfterMs: 0 };
}

export { distributedRateLimit as rateLimit };
