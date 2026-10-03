import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { driveFiles, googleAccounts } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { FILE_KINDS, classifyMime, type FileKind } from '@/lib/files/mime';
import { sortFiles, type SortKey } from '@/lib/files/merge';
import { buildDriveQuery } from '@/lib/google-drive/query';
import { GoogleDriveService } from '@/lib/google-drive/service';
import type { DriveFileDto } from '@/lib/google-drive/types';
import { ok, withAuth } from '@/lib/http';

const MAX_PER_ACCOUNT = 100;
const SORT_KEYS: SortKey[] = ['name', 'size', 'modified'];

export const GET = withAuth(async (user, req) => {
  const sp = req.nextUrl.searchParams;
  const accountId = sp.get('accountId');
  const search = sp.get('search') ?? undefined;
  const kindParam = sp.get('kind');
  const sortParam = sp.get('sort');
  const dir = sp.get('dir') === 'asc' ? 'asc' : 'desc';

  const ALLOWED_KINDS: string[] = [...FILE_KINDS, 'folder'];
  if (kindParam && kindParam !== 'all' && !ALLOWED_KINDS.includes(kindParam)) {
    throw new AppError('VALIDATION', 'Jenis file tidak dikenal.', 400);
  }
  if (sortParam && !SORT_KEYS.includes(sortParam as SortKey)) {
    throw new AppError('VALIDATION', 'Kunci urutan tidak dikenal.', 400);
  }
  const kind = !kindParam || kindParam === 'all' ? undefined : (kindParam as FileKind);
  const sort = (sortParam as SortKey | null) ?? 'modified';

  const accounts = await db.select().from(googleAccounts).where(eq(googleAccounts.userId, user.id));
  const targets = accountId ? accounts.filter((a) => a.id === accountId) : accounts;
  if (accountId && targets.length === 0)
    throw new AppError('NOT_FOUND', 'Akun tidak ditemukan.', 404);

  const q = buildDriveQuery({ search, kind });
  const results = await Promise.allSettled(
    targets.map(async (account) => {
      const service = await GoogleDriveService.forAccount(account);
      const { files } = await service.listFiles({ q, pageSize: MAX_PER_ACCOUNT });
      return files;
    }),
  );

  const files: DriveFileDto[] = [];
  const failedAccounts: string[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') files.push(...result.value);
    else failedAccounts.push(targets[i]!.email);
  });

  if (kind === 'other' || kind === 'folder') {
    const filtered = files.filter((f) => classifyMime(f.mimeType) === kind);
    files.length = 0;
    files.push(...filtered);
  }

  if (files.length > 0) {
    await db
      .insert(driveFiles)
      .values(
        files.map((f) => ({
          googleAccountId: f.accountId,
          driveFileId: f.id,
          name: f.name,
          mimeType: f.mimeType,
          kind: classifyMime(f.mimeType),
          sizeBytes: f.sizeBytes,
          modifiedAt: f.modifiedAt ? new Date(f.modifiedAt) : null,
          parentId: f.parentId,
          indexedAt: new Date(),
        })),
      )
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
  }

  return ok({ files: sortFiles(files, sort, dir), failedAccounts });
});
