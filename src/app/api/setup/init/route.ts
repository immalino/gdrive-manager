import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { initSharedRoot } from '@/lib/shared-drive/setup';

export const POST = withAuth(async (user, req) => {
  const limit = rateLimit(`mutate:${user.id}`, 30, 60_000);
  if (!limit.ok) {
    throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);
  }

  const body = (await req.json().catch(() => null)) as {
    primaryAccountId?: string;
    folderName?: string;
  } | null;

  if (!body?.primaryAccountId) {
    throw new AppError('VALIDATION', 'primaryAccountId wajib diisi.', 400);
  }

  const result = await initSharedRoot({
    userId: user.id,
    primaryAccountId: body.primaryAccountId,
    folderName: body.folderName,
  });

  return ok(result, 201);
});
