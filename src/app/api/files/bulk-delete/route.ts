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
import type { BulkDeleteItem, BulkDeleteResponse } from '@/types';

export const POST = withAuth(async (user, req) => {
  const limit = await rateLimit(`mutate:${user.id}`, 30, 60_000);
  if (!limit.ok) {
    throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);
  }

  const body = (await req.json().catch(() => ({}))) as {
    items?: BulkDeleteItem[];
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
  const defaultAccountId = setupStatus.primaryAccount?.id ?? userAccounts[0]?.id;

  // Resolve accountIds from driveFiles for all items (preferring DB record over client hint)
  const allItemIds = body.items.map((item) => item.id);
  const foundRecords =
    (await db
      .select({
        driveFileId: driveFiles.driveFileId,
        googleAccountId: driveFiles.googleAccountId,
      })
      .from(driveFiles)
      .innerJoin(googleAccounts, eq(driveFiles.googleAccountId, googleAccounts.id))
      .where(
        and(inArray(driveFiles.driveFileId, allItemIds), eq(googleAccounts.userId, user.id)),
      )) || [];
  const idToAcc = new Map(foundRecords.map((r) => [r.driveFileId, r.googleAccountId]));
  for (const item of body.items) {
    const dbAccountId = idToAcc.get(item.id);
    if (dbAccountId) {
      item.accountId = dbAccountId;
    } else if (!item.accountId) {
      item.accountId = defaultAccountId;
    }
  }

  for (const item of body.items) {
    if (!item.accountId || !userAccountMap.has(item.accountId)) {
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
    let currentAccountId = accountId;
    const service = await getService(currentAccountId);
    try {
      await service.deleteFile(id);
    } catch (err: unknown) {
      // If permission denied (403), probe actual owner via Google Drive API
      let resolved = false;
      try {
        const probeService = defaultAccountId ? await getService(defaultAccountId) : service;
        const meta = await probeService.getFile(id, 'id,name,owners(emailAddress)');
        if (meta.ownerEmail) {
          const realOwner = userAccounts.find(
            (a) => a.email.toLowerCase() === meta.ownerEmail?.toLowerCase(),
          );
          if (realOwner && realOwner.id !== currentAccountId) {
            const realService = await getService(realOwner.id);
            await realService.deleteFile(id);
            currentAccountId = realOwner.id;
            resolved = true;
          }
        }
      } catch {
        // probe failed
      }
      if (!resolved) throw err;
    }

    await db.delete(driveFiles).where(eq(driveFiles.driveFileId, id));
    await logActivity({
      userId: user.id,
      googleAccountId: currentAccountId,
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
