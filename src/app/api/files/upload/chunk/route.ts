import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { uploadJobs } from '@/db/schema';
import { logActivity } from '@/lib/activity';
import { AppError } from '@/lib/errors';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { ok, withAuth } from '@/lib/http';
import { syncQuota } from '@/lib/quota';

export const PUT = withAuth(async (user, req) => {
  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!jobId) {
    throw new AppError('VALIDATION', 'jobId wajib disertakan.', 400);
  }

  const contentRange = req.headers.get('content-range');
  if (!contentRange) {
    throw new AppError('VALIDATION', 'Header Content-Range wajib disertakan.', 400);
  }

  const match = contentRange.match(/^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/);
  if (!match) {
    throw new AppError(
      'VALIDATION',
      'Format Content-Range tidak valid (contoh: bytes 0-1023/2048).',
      400,
    );
  }

  const startByte = Number(match[1]);
  const endByte = Number(match[2]);
  if (startByte > endByte) {
    throw new AppError('VALIDATION', 'Range startByte tidak boleh lebih besar dari endByte.', 400);
  }

  const [job] = await db
    .select()
    .from(uploadJobs)
    .where(and(eq(uploadJobs.id, jobId), eq(uploadJobs.userId, user.id)));

  if (!job) {
    throw new AppError('NOT_FOUND', 'Upload job tidak ditemukan.', 404);
  }

  if (!job.resumableUri) {
    throw new AppError('VALIDATION', 'Job tidak memiliki sesi resumable.', 400);
  }

  const totalSize = match[3] === '*' ? job.fileSize : Number(match[3]);
  const account = await getAccountForUser(user.id, job.googleAccountId);

  const chunk = await req.arrayBuffer();
  if (chunk.byteLength !== endByte - startByte + 1) {
    throw new AppError('VALIDATION', 'Ukuran body tidak sesuai dengan Content-Range.', 400);
  }

  try {
    const service = await GoogleDriveService.forAccount(account);
    const result = await service.uploadChunk({
      sessionUri: job.resumableUri,
      chunk,
      startByte,
      totalSize,
    });

    const uploadedBytes = result.completed ? totalSize : endByte + 1;

    await db
      .update(uploadJobs)
      .set({
        uploadedBytes,
        ...(result.completed ? { status: 'completed', completedAt: new Date() } : {}),
      })
      .where(and(eq(uploadJobs.id, job.id), eq(uploadJobs.userId, user.id)));

    if (result.completed) {
      await syncQuota(account);
      await logActivity({
        userId: user.id,
        googleAccountId: account.id,
        action: 'file.upload',
        fileId: result.file?.id,
        metadata: { filename: job.filename, sizeBytes: totalSize },
      });
    }

    return ok({
      completed: result.completed,
      uploadedBytes,
      file: result.file,
    });
  } catch (error) {
    await db
      .update(uploadJobs)
      .set({
        errorMessage: error instanceof Error ? error.message : 'Chunk upload failed',
      })
      .where(and(eq(uploadJobs.id, job.id), eq(uploadJobs.userId, user.id)));
    throw error;
  }
});
