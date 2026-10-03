import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { driveFiles } from '@/db/schema';
import { logActivity } from '@/lib/activity';
import { AppError } from '@/lib/errors';
import { classifyMime } from '@/lib/files/mime';
import { ok, withAuth } from '@/lib/http';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { rateLimit } from '@/lib/rate-limit';
import { getSetupStatus } from '@/lib/shared-drive/setup';
import { resolveFileAccount } from '../route';

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth<Ctx>(async (user, req, ctx) => {
  const limit = rateLimit(`mutate:${user.id}`, 30, 60_000);
  if (!limit.ok)
    throw new AppError('RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);
  const { id } = await ctx.params;
  const accountId = req.nextUrl.searchParams.get('accountId');
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    folderId?: string;
  };
  const { name, folderId } = body;
  if (!name?.trim()) throw new AppError('VALIDATION', 'name wajib diisi.', 400);

  const account = await resolveFileAccount(user.id, id, accountId);
  const setupStatus = await getSetupStatus(user.id);

  let targetFolderId = folderId;
  if (setupStatus.sharedRoot && (!targetFolderId || targetFolderId === 'root')) {
    targetFolderId = setupStatus.sharedRoot.driveFolderId;
  }

  const service = await GoogleDriveService.forAccount(account);
  const copy = await service.copyFile(id, name.trim(), targetFolderId);

  await db
    .insert(driveFiles)
    .values({
      googleAccountId: account.id,
      driveFileId: copy.id,
      name: copy.name,
      mimeType: copy.mimeType,
      kind: classifyMime(copy.mimeType),
      sizeBytes: copy.sizeBytes,
      modifiedAt: copy.modifiedAt ? new Date(copy.modifiedAt) : null,
      parentId: targetFolderId ?? copy.parentId,
      indexedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [driveFiles.googleAccountId, driveFiles.driveFileId],
      set: {
        name: sql`excluded.name`,
        mimeType: sql`excluded.mime_type`,
        kind: sql`excluded.kind`,
        sizeBytes: sql`excluded.size_bytes`,
        modifiedAt: sql`excluded.modified_at`,
        parentId: sql`excluded.parent_id`,
        indexedAt: sql`excluded.indexed_at`,
      },
    });

  await logActivity({
    userId: user.id,
    googleAccountId: account.id,
    action: 'file.copy',
    fileId: copy.id,
    metadata: { sourceFileId: id, name: copy.name, targetFolderId },
  });
  return ok({ file: copy }, 201);
});
