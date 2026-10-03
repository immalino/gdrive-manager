import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { driveFiles } from '@/db/schema';
import { logActivity } from '@/lib/activity';
import { AppError } from '@/lib/errors';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { ok, withAuth } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { runBatchPool } from '@/lib/utils/batch';
import type { BulkMoveItem, BulkMoveResponse } from '@/types';

export const POST = withAuth(async (user, req) => {
  const limit = rateLimit(`mutate:${user.id}`, 30, 60_000);
  if (!limit.ok) {
    throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);
  }

  const body = (await req.json().catch(() => ({}))) as {
    items?: BulkMoveItem[];
    targetFolderId?: string | null;
    targetAccountId?: string;
  };

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100) {
    throw new AppError('VALIDATION', 'items harus berupa array tidak kosong (maksimal 100).', 400);
  }

  if (!body.targetAccountId) {
    throw new AppError('VALIDATION', 'targetAccountId wajib diisi.', 400);
  }

  if (body.items.some((item) => item.accountId !== body.targetAccountId)) {
    throw new AppError(
      'VALIDATION',
      'Semua item harus berasal dari targetAccountId yang sama (pemindahan lintas akun belum didukung).',
      400,
    );
  }

  if (body.items.some((item) => !item.id)) {
    throw new AppError('VALIDATION', 'Setiap item wajib memiliki id.', 400);
  }

  const account = await getAccountForUser(user.id, body.targetAccountId);
  const service = await GoogleDriveService.forAccount(account);
  const targetFolderId =
    body.targetFolderId === 'root' || !body.targetFolderId ? null : body.targetFolderId;

  const results = await runBatchPool(body.items, 5, async ({ id, fromFolderId }) => {
    await service.moveFile(id, fromFolderId ?? null, targetFolderId);
    await db
      .update(driveFiles)
      .set({ parentId: targetFolderId })
      .where(and(eq(driveFiles.googleAccountId, account.id), eq(driveFiles.driveFileId, id)));
    await logActivity({
      userId: user.id,
      googleAccountId: account.id,
      action: 'file.move',
      fileId: id,
      metadata: { bulk: true, toFolderId: targetFolderId },
    });
    return { id };
  });

  const movedCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;
  const errors = results
    .filter((r) => !r.success)
    .map((r) => ({
      id: r.item.id,
      error: r.error,
    }));

  const response: BulkMoveResponse = {
    movedCount,
    failedCount,
    errors,
  };

  return ok(response);
});
