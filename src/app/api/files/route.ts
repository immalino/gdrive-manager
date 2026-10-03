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
  const recent = sp.get('recent') === '1';
  const accountId = sp.get('accountId');
  const search = recent ? undefined : (sp.get('search') ?? undefined);
  const kindParam = recent ? undefined : sp.get('kind');
  const sortParam = recent ? 'modified' : sp.get('sort');
  const dir = recent ? 'desc' : sp.get('dir') === 'asc' ? 'asc' : 'desc';

  const ALLOWED_KINDS: string[] = [...FILE_KINDS, 'folder'];
  if (!recent && kindParam && kindParam !== 'all' && !ALLOWED_KINDS.includes(kindParam)) {
    throw new AppError('VALIDATION', 'Jenis file tidak dikenal.', 400);
  }
  if (!recent && sortParam && !SORT_KEYS.includes(sortParam as SortKey)) {
    throw new AppError('VALIDATION', 'Kunci urutan tidak dikenal.', 400);
  }
  const kind = recent || !kindParam || kindParam === 'all' ? undefined : (kindParam as FileKind);
  const sort = recent ? 'modified' : ((sortParam as SortKey | null) ?? 'modified');

  let sizeMin: number | undefined;
  let sizeMax: number | undefined;
  let modifiedAfter: string | undefined;
  let modifiedBefore: string | undefined;

  if (!recent) {
    const sizeMinRaw = sp.get('sizeMin');
    if (sizeMinRaw !== null && sizeMinRaw !== '') {
      const val = Number(sizeMinRaw);
      if (isNaN(val) || val < 0) {
        throw new AppError('VALIDATION', 'Ukuran minimal tidak valid.', 400);
      }
      sizeMin = val;
    }

    const sizeMaxRaw = sp.get('sizeMax');
    if (sizeMaxRaw !== null && sizeMaxRaw !== '') {
      const val = Number(sizeMaxRaw);
      if (isNaN(val) || val < 0) {
        throw new AppError('VALIDATION', 'Ukuran maksimal tidak valid.', 400);
      }
      sizeMax = val;
    }

    const modifiedAfterRaw = sp.get('modifiedAfter');
    if (modifiedAfterRaw !== null && modifiedAfterRaw !== '') {
      const d = new Date(modifiedAfterRaw);
      if (isNaN(d.getTime())) {
        throw new AppError('VALIDATION', 'Tanggal modifiedAfter tidak valid.', 400);
      }
      modifiedAfter = modifiedAfterRaw;
    }

    const modifiedBeforeRaw = sp.get('modifiedBefore');
    if (modifiedBeforeRaw !== null && modifiedBeforeRaw !== '') {
      const d = new Date(modifiedBeforeRaw);
      if (isNaN(d.getTime())) {
        throw new AppError('VALIDATION', 'Tanggal modifiedBefore tidak valid.', 400);
      }
      modifiedBefore = modifiedBeforeRaw;
    }
  }

  const accountIdsParam = sp.get('accountIds');
  const accounts = await db.select().from(googleAccounts).where(eq(googleAccounts.userId, user.id));

  let targets = accounts;
  if (!recent && accountIdsParam !== null && accountIdsParam !== '') {
    const ids = accountIdsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length > 0) {
      targets = accounts.filter((a) => ids.includes(a.id));
    }
  } else if (accountId && accountId !== 'all') {
    targets = accounts.filter((a) => a.id === accountId);
    if (targets.length === 0) {
      throw new AppError('NOT_FOUND', 'Akun tidak ditemukan.', 404);
    }
  }

  const q = buildDriveQuery({ search, kind, sizeMin, sizeMax, modifiedAfter, modifiedBefore });
  const pageSize = recent ? 8 : MAX_PER_ACCOUNT;
  const results = await Promise.allSettled(
    targets.map(async (account) => {
      const service = await GoogleDriveService.forAccount(account);
      const { files } = await service.listFiles({ q, pageSize });
      return files;
    }),
  );

  const files: DriveFileDto[] = [];
  const failedAccounts: string[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') files.push(...result.value);
    else failedAccounts.push(targets[i]!.email);
  });

  if (!recent && (kind === 'other' || kind === 'folder')) {
    const filtered = files.filter((f) => classifyMime(f.mimeType) === kind);
    files.length = 0;
    files.push(...filtered);
  }

  if (!recent && sizeMin != null) {
    const filtered = files.filter((f) => f.sizeBytes != null && f.sizeBytes > sizeMin);
    files.length = 0;
    files.push(...filtered);
  }

  if (!recent && sizeMax != null) {
    const filtered = files.filter((f) => f.sizeBytes != null && f.sizeBytes < sizeMax);
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

  const sorted = sortFiles(files, sort, dir);
  return ok({ files: recent ? sorted.slice(0, 8) : sorted, failedAccounts });
});
