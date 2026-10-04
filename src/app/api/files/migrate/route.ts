import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { migrateFile } from '@/lib/google-drive/migration';

export const POST = withAuth(async (user, req) => {
  const limit = rateLimit(`mutate:${user.id}`, 30, 60_000);
  if (!limit.ok) {
    throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION', 'Payload JSON tidak valid.', 400);
  }

  const { fileId, targetAccountId, sourceAccountId } = (body ?? {}) as {
    fileId?: string;
    targetAccountId?: string;
    sourceAccountId?: string;
  };

  if (!fileId || typeof fileId !== 'string') {
    throw new AppError('VALIDATION', 'Parameter fileId wajib disertakan.', 400);
  }

  if (!targetAccountId || typeof targetAccountId !== 'string') {
    throw new AppError('VALIDATION', 'Parameter targetAccountId wajib disertakan.', 400);
  }

  const result = await migrateFile({
    userId: user.id,
    fileId,
    targetAccountId,
    sourceAccountId,
  });

  return ok(result);
});
