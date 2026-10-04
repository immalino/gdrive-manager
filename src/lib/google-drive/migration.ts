import { db } from '@/db';
import { driveFiles, googleAccounts } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { GoogleDriveService } from '@/lib/google-drive/service';
import type { DriveFileDto } from '@/lib/google-drive/types';
import { AppError } from '@/lib/errors';
import { logActivity } from '@/lib/activity';
import { syncQuota } from '@/lib/quota';
import { classifyMime } from '@/lib/files/mime';

export interface MigrateFileParams {
  userId: string;
  fileId: string;
  targetAccountId: string;
  sourceAccountId?: string;
}

export interface MigrateFileResult {
  success: boolean;
  oldFileId: string;
  newFile: DriveFileDto;
}

export async function migrateFile(params: MigrateFileParams): Promise<MigrateFileResult> {
  const { userId, fileId, targetAccountId } = params;

  // 1. Dapatkan akun target
  const targetAccount = await db.query.googleAccounts.findFirst({
    where: and(eq(googleAccounts.id, targetAccountId), eq(googleAccounts.userId, userId)),
  });
  if (!targetAccount || targetAccount.status !== 'connected') {
    throw new AppError('NOT_FOUND', 'Akun target tidak ditemukan atau tidak terhubung.', 404);
  }
  if (!targetAccount.isUploadEnabled) {
    throw new AppError(
      'UPLOAD_DISABLED',
      'Akun target dinonaktifkan untuk penambahan berkas.',
      400,
    );
  }

  // 2. Dapatkan akun sumber
  let sourceAccountId = params.sourceAccountId;
  if (!sourceAccountId) {
    // Cari di index cache drive_files
    const cached = await db.query.driveFiles.findFirst({
      where: eq(driveFiles.driveFileId, fileId),
    });
    if (cached) {
      // Verifikasi bahwa akun pemilik ada di daftar akun user ini
      const ownerAccount = await db.query.googleAccounts.findFirst({
        where: and(
          eq(googleAccounts.id, cached.googleAccountId),
          eq(googleAccounts.userId, userId),
        ),
      });
      if (ownerAccount) {
        sourceAccountId = ownerAccount.id;
      }
    }
  }

  if (!sourceAccountId) {
    throw new AppError('VALIDATION', 'Akun sumber tidak dapat ditentukan.', 400);
  }

  if (sourceAccountId === targetAccountId) {
    throw new AppError('VALIDATION', 'Akun sumber dan akun tujuan tidak boleh sama.', 400);
  }

  const sourceAccount = await db.query.googleAccounts.findFirst({
    where: and(eq(googleAccounts.id, sourceAccountId), eq(googleAccounts.userId, userId)),
  });
  if (!sourceAccount || sourceAccount.status !== 'connected') {
    throw new AppError('NOT_FOUND', 'Akun sumber tidak ditemukan atau tidak terhubung.', 404);
  }

  // 3. Inisialisasi GoogleDriveService untuk kedua akun
  const sourceService = await GoogleDriveService.forAccount(sourceAccount);
  const targetService = await GoogleDriveService.forAccount(targetAccount);

  // 4. Ambil metadata file dari Google Drive
  const fileMeta = await sourceService.getFile(fileId);
  if (fileMeta.mimeType === 'application/vnd.google-apps.folder') {
    throw new AppError('VALIDATION', 'Folder tidak dapat dimigrasikan.', 400);
  }

  // 5. Cek kuota akun target
  const targetQuota = await targetService.getStorageQuota();
  if (
    targetQuota.freeBytes !== null &&
    fileMeta.sizeBytes !== null &&
    targetQuota.freeBytes < fileMeta.sizeBytes
  ) {
    throw new AppError(
      'QUOTA_EXCEEDED',
      'Kapasitas akun target tidak mencukupi untuk file ini.',
      413,
    );
  }

  // 6. Download file dari akun sumber (streaming in-flight)
  const downloadRes = await sourceService.downloadFile(fileId);
  if (!downloadRes.body) {
    throw new AppError('INTERNAL', 'Gagal mengunduh file dari akun sumber.', 500);
  }

  const contentLength = Number(
    downloadRes.headers.get('content-length') ?? fileMeta.sizeBytes ?? 0,
  );
  const contentType =
    downloadRes.headers.get('content-type') ?? fileMeta.mimeType ?? 'application/octet-stream';

  // 7. Upload file ke akun target dalam parent folder yang SAMA
  const newFile = await targetService.uploadFile({
    stream: downloadRes.body,
    contentLength,
    contentType,
    filename: fileMeta.name,
    parentId: fileMeta.parentId ?? undefined,
  });

  // 8. Hapus file asli dari akun sumber
  try {
    await sourceService.deleteFile(fileId);
  } catch (delErr) {
    console.warn('[migrateFile] gagal menghapus file asli setelah upload:', delErr);
  }

  // 9. Update index cache drive_files
  await db.delete(driveFiles).where(eq(driveFiles.driveFileId, fileId));

  await db
    .insert(driveFiles)
    .values({
      googleAccountId: targetAccount.id,
      driveFileId: newFile.id,
      name: newFile.name,
      mimeType: newFile.mimeType,
      kind: classifyMime(newFile.mimeType),
      sizeBytes: newFile.sizeBytes,
      modifiedAt: newFile.modifiedAt ? new Date(newFile.modifiedAt) : null,
      parentId: newFile.parentId,
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

  // 10. Sync kuota kedua akun
  try {
    await syncQuota(sourceAccount);
  } catch (err) {
    console.warn('[migrateFile] gagal sync quota source account:', err);
  }
  try {
    await syncQuota(targetAccount);
  } catch (err) {
    console.warn('[migrateFile] gagal sync quota target account:', err);
  }

  // 11. Log aktivitas
  await logActivity({
    userId,
    googleAccountId: targetAccount.id,
    action: 'file.migrate',
    fileId: newFile.id,
    metadata: {
      oldFileId: fileId,
      newFileId: newFile.id,
      fileName: newFile.name,
      sourceAccountId: sourceAccount.id,
      sourceEmail: sourceAccount.email,
      targetAccountId: targetAccount.id,
      targetEmail: targetAccount.email,
      sizeBytes: newFile.sizeBytes,
      parentFolderId: newFile.parentId,
    },
  });

  return {
    success: true,
    oldFileId: fileId,
    newFile,
  };
}
