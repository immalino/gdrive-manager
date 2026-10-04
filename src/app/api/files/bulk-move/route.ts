import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { driveFiles, googleAccounts } from '@/db/schema';
import { logActivity } from '@/lib/activity';
import { AppError } from '@/lib/errors';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { ok, withAuth } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit/distributed';
import { runBatchPool } from '@/lib/utils/batch';
import { getSetupStatus } from '@/lib/shared-drive/setup';
import type { BulkMoveItem, BulkMoveResponse } from '@/types';

export const POST = withAuth(async (user, req) => {
  const limit = await rateLimit(`mutate:${user.id}`, 30, 60_000);
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

  if (body.items.some((item) => !item.id)) {
    throw new AppError('VALIDATION', 'Setiap item wajib memiliki id.', 400);
  }

  const userAccounts = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.userId, user.id));

  const userAccountMap = new Map(userAccounts.map((acc) => [acc.id, acc]));
  const setupStatus = await getSetupStatus(user.id);
  const defaultAccountId =
    body.targetAccountId ?? setupStatus.primaryAccount?.id ?? userAccounts[0]?.id;

  // Resolve missing accountIds from driveFiles
  const missingAccItemIds = body.items.filter((item) => !item.accountId).map((item) => item.id);
  if (missingAccItemIds.length > 0) {
    const foundRecords = await db
      .select({
        driveFileId: driveFiles.driveFileId,
        googleAccountId: driveFiles.googleAccountId,
      })
      .from(driveFiles)
      .innerJoin(googleAccounts, eq(driveFiles.googleAccountId, googleAccounts.id))
      .where(
        and(inArray(driveFiles.driveFileId, missingAccItemIds), eq(googleAccounts.userId, user.id)),
      );
    const idToAcc = new Map(foundRecords.map((r) => [r.driveFileId, r.googleAccountId]));
    for (const item of body.items) {
      if (!item.accountId) {
        item.accountId = idToAcc.get(item.id) ?? defaultAccountId;
      }
    }
  }

  for (const item of body.items) {
    if (!item.accountId || !userAccountMap.has(item.accountId)) {
      throw new AppError('NOT_FOUND', `Akun dengan ID ${item.accountId} tidak ditemukan.`, 404);
    }
  }

  let targetFolderId =
    body.targetFolderId === 'root' || !body.targetFolderId ? null : body.targetFolderId;
  if (setupStatus.sharedRoot && targetFolderId === null) {
    targetFolderId = setupStatus.sharedRoot.driveFolderId;
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

  const results = await runBatchPool(body.items, 5, async ({ id, accountId, fromFolderId }) => {
    const service = await getService(accountId!);
    await service.moveFile(id, fromFolderId ?? null, targetFolderId);
    await db
      .update(driveFiles)
      .set({ parentId: targetFolderId })
      .where(eq(driveFiles.driveFileId, id));
    await logActivity({
      userId: user.id,
      googleAccountId: accountId!,
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
