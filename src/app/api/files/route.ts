import { and, eq, ilike, ne, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { driveFiles, googleAccounts } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { FILE_KINDS, classifyMime, type FileKind } from '@/lib/files/mime';
import { sortFiles, type SortKey } from '@/lib/files/merge';
import { buildDriveQuery } from '@/lib/google-drive/query';
import { GoogleDriveService } from '@/lib/google-drive/service';
import type { DriveFileDto } from '@/lib/google-drive/types';
import { ok, withAuth } from '@/lib/http';
import { getSetupStatus } from '@/lib/shared-drive/setup';
import { getFolderBreadcrumb } from '@/lib/shared-drive/breadcrumb';
import type { BreadcrumbItem } from '@/types';

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

  const limitParam = sp.get('limit');
  const recentLimit = limitParam ? Math.max(1, Math.min(100, Number(limitParam))) : 8;

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
  }

  const modifiedAfterRaw = sp.get('modifiedAfter');
  if (modifiedAfterRaw !== null && modifiedAfterRaw !== '') {
    const d = new Date(modifiedAfterRaw);
    if (isNaN(d.getTime())) {
      throw new AppError('VALIDATION', 'Tanggal modifiedAfter tidak valid.', 400);
    }
    modifiedAfter = modifiedAfterRaw;
  }

  if (!recent) {
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
  const emailToAccount = new Map(accounts.map((a) => [a.email.toLowerCase(), a]));

  function resolveFileOwner(file: DriveFileDto) {
    if (file.ownerEmail) {
      const ownerAcc = emailToAccount.get(file.ownerEmail.toLowerCase());
      if (ownerAcc) {
        file.accountId = ownerAcc.id;
        file.accountEmail = ownerAcc.email;
      }
    }
  }

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

  const folderIdParam = sp.get('folderId');
  const setupStatus = await getSetupStatus(user.id);
  const sharedRoot = setupStatus.sharedRoot;

  let targetFolderId: string | undefined = folderIdParam ?? undefined;
  if (!recent && !targetFolderId && sharedRoot) {
    targetFolderId = sharedRoot.driveFolderId;
  }

  let files: DriveFileDto[] = [];
  const failedAccounts: string[] = [];

  // Scoped search logic: if searching within a configured shared drive
  if (search?.trim() && sharedRoot) {
    const conditions = [
      eq(googleAccounts.userId, user.id),
      ilike(driveFiles.name, `%${search.trim()}%`),
    ];
    if (kind) {
      conditions.push(eq(driveFiles.kind, kind));
    }
    if (sizeMin != null) {
      conditions.push(sql`${driveFiles.sizeBytes} > ${sizeMin}`);
    }
    if (sizeMax != null) {
      conditions.push(sql`${driveFiles.sizeBytes} < ${sizeMax}`);
    }
    if (modifiedAfter) {
      conditions.push(sql`${driveFiles.modifiedAt} > ${new Date(modifiedAfter)}`);
    }
    if (modifiedBefore) {
      conditions.push(sql`${driveFiles.modifiedAt} < ${new Date(modifiedBefore)}`);
    }
    if (folderIdParam) {
      conditions.push(eq(driveFiles.parentId, folderIdParam));
    }

    const cachedRecords = await db
      .select({
        id: driveFiles.driveFileId,
        name: driveFiles.name,
        mimeType: driveFiles.mimeType,
        sizeBytes: driveFiles.sizeBytes,
        modifiedAt: driveFiles.modifiedAt,
        parentId: driveFiles.parentId,
        accountId: driveFiles.googleAccountId,
        accountEmail: googleAccounts.email,
      })
      .from(driveFiles)
      .innerJoin(googleAccounts, eq(driveFiles.googleAccountId, googleAccounts.id))
      .where(and(...conditions));

    if (cachedRecords.length > 0) {
      files = cachedRecords.map((r) => ({
        id: r.id,
        name: r.name,
        mimeType: r.mimeType,
        sizeBytes: r.sizeBytes,
        modifiedAt: r.modifiedAt ? r.modifiedAt.toISOString() : null,
        parentId: r.parentId,
        webViewLink: null,
        accountId: r.accountId,
        accountEmail: r.accountEmail,
      }));
    } else {
      // Fallback to Google Drive API scoped query
      const targetFolder = targetFolderId ?? sharedRoot.driveFolderId;
      const q = buildDriveQuery({
        folderId: targetFolder,
        search,
        kind,
        sizeMin,
        sizeMax,
        modifiedAfter,
        modifiedBefore,
      });
      const pageSize = recent ? recentLimit : MAX_PER_ACCOUNT;
      const results = await Promise.allSettled(
        targets.map(async (account) => {
          const service = await GoogleDriveService.forAccount(account);
          const { files: accountFiles } = await service.listFiles({ q, pageSize });
          return accountFiles;
        }),
      );
      const rawFiles: DriveFileDto[] = [];
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') rawFiles.push(...result.value);
        else failedAccounts.push(targets[i]!.email);
      });
      const seenIds = new Set<string>();
      for (const f of rawFiles) {
        resolveFileOwner(f);
        if (!seenIds.has(f.id)) {
          seenIds.add(f.id);
          files.push(f);
        }
      }
      if (kind === 'other' || kind === 'folder') {
        files = files.filter((f) => classifyMime(f.mimeType) === kind);
      }
      if (sizeMin != null) {
        files = files.filter((f) => f.sizeBytes != null && f.sizeBytes > sizeMin);
      }
      if (sizeMax != null) {
        files = files.filter((f) => f.sizeBytes != null && f.sizeBytes < sizeMax);
      }
      if (files.length > 0) {
        const cleanupConditions = files.map((f) =>
          and(eq(driveFiles.driveFileId, f.id), ne(driveFiles.googleAccountId, f.accountId)),
        );
        if (cleanupConditions.length > 0) {
          await db.delete(driveFiles).where(or(...cleanupConditions));
        }
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
    }
  } else {
    // Normal folder browsing or non-shared-root query
    const q = buildDriveQuery({
      folderId: targetFolderId,
      search,
      kind,
      sizeMin,
      sizeMax,
      modifiedAfter,
      modifiedBefore,
    });
    const pageSize = recent ? recentLimit : MAX_PER_ACCOUNT;
    const results = await Promise.allSettled(
      targets.map(async (account) => {
        const service = await GoogleDriveService.forAccount(account);
        const { files: accountFiles } = await service.listFiles({ q, pageSize });
        return accountFiles;
      }),
    );

    const rawFiles: DriveFileDto[] = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') rawFiles.push(...result.value);
      else failedAccounts.push(targets[i]!.email);
    });

    const seenIds = new Set<string>();
    for (const f of rawFiles) {
      resolveFileOwner(f);
      if (!seenIds.has(f.id)) {
        seenIds.add(f.id);
        files.push(f);
      }
    }

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
      const cleanupConditions = files.map((f) =>
        and(eq(driveFiles.driveFileId, f.id), ne(driveFiles.googleAccountId, f.accountId)),
      );
      if (cleanupConditions.length > 0) {
        await db.delete(driveFiles).where(or(...cleanupConditions));
      }
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
  }

  let currentFolder: BreadcrumbItem | null = null;
  let breadcrumb: BreadcrumbItem[] = [];

  if (targetFolderId && sharedRoot) {
    const serviceAccount = setupStatus.primaryAccount ?? accounts[0] ?? null;
    if (serviceAccount) {
      try {
        const service = await GoogleDriveService.forAccount(serviceAccount);
        const bcResult = await getFolderBreadcrumb(
          service,
          sharedRoot.driveFolderId,
          targetFolderId,
          sharedRoot.folderName || 'My Drive',
        );
        currentFolder = bcResult.currentFolder;
        breadcrumb = bcResult.breadcrumb;
      } catch (err) {
        console.warn('[GET /api/files] Failed to compute breadcrumb:', err);
      }
    }
  }

  const sorted = sortFiles(files, sort, dir);
  return ok({
    files: recent ? sorted.slice(0, recentLimit) : sorted,
    failedAccounts,
    currentFolder,
    breadcrumb,
  });
});
