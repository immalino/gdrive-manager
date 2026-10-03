import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { driveFiles, googleAccounts } from '@/db/schema';
import { logActivity } from '@/lib/activity';
import { AppError } from '@/lib/errors';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { ok, withAuth } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { runBatchPool } from '@/lib/utils/batch';
import type { BulkDeleteItem, BulkDeleteResponse } from '@/types';

export const POST = withAuth(async (user, req) => {
  const limit = rateLimit(`mutate:${user.id}`, 30, 60_000);
  if (!limit.ok) {
    throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);
  }

  const body = (await req.json().catch(() => ({}))) as {
    items?: BulkDeleteItem[];
  };

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100) {
    throw new AppError('VALIDATION', 'items harus berupa array tidak kosong (maksimal 100).', 400);
  }

  if (body.items.some((item) => !item.id || !item.accountId)) {
    throw new AppError('VALIDATION', 'Setiap item wajib memiliki id dan accountId.', 400);
  }

  const userAccounts = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.userId, user.id));

  const userAccountMap = new Map(userAccounts.map((acc) => [acc.id, acc]));

  for (const item of body.items) {
    if (!userAccountMap.has(item.accountId)) {
      throw new AppError('NOT_FOUND', `Akun dengan ID ${item.accountId} tidak ditemukan.`, 404);
    }
  }

  const services = new Map<string, GoogleDriveService>();
  async function getService(accountId: string) {
    let s = services.get(accountId);
    if (!s) {
      const acc = userAccountMap.get(accountId)!;
      s = await GoogleDriveService.forAccount(acc);
      services.set(accountId, s);
    }
    return s;
  }

  const results = await runBatchPool(body.items, 5, async ({ id, accountId, name }) => {
    const service = await getService(accountId);
    await service.deleteFile(id);
    await db
      .delete(driveFiles)
      .where(and(eq(driveFiles.googleAccountId, accountId), eq(driveFiles.driveFileId, id)));
    await logActivity({
      userId: user.id,
      googleAccountId: accountId,
      action: 'file.delete',
      fileId: id,
      metadata: { bulk: true, name },
    });
    return { id };
  });

  const deletedCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;
  const errors = results
    .filter((r) => !r.success)
    .map((r) => ({
      id: r.item.id,
      name: r.item.name,
      error: r.error,
    }));

  const response: BulkDeleteResponse = {
    deletedCount,
    failedCount,
    errors,
  };

  return ok(response);
});
