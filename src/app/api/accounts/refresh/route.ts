import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';
import { syncAllQuotas } from '@/lib/quota';
import { rateLimit } from '@/lib/rate-limit';

export const POST = withAuth(async (user) => {
  const limit = rateLimit(`mutate:${user.id}`, 30, 60_000);
  if (!limit.ok)
    throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);
  const synced = await syncAllQuotas(user.id);
  return ok({ synced });
});
