import { ok, withAuth } from '@/lib/http';
import { getSetupStatus } from '@/lib/shared-drive/setup';

export const GET = withAuth(async (user) => {
  const status = await getSetupStatus(user.id);
  return ok(status);
});
