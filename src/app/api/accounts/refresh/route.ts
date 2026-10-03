import { ok, withAuth } from '@/lib/http';
import { syncAllQuotas } from '@/lib/quota';

export const POST = withAuth(async (user) => {
  const synced = await syncAllQuotas(user.id);
  return ok({ synced });
});
