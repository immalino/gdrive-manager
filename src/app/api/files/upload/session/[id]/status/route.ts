import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { uploadJobs } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { getAccountForUser } from '@/lib/google/tokens';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { ok, withAuth } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (user, _req, ctx) => {
  const { id: jobId } = await ctx.params;
  const [job] = await db
    .select()
    .from(uploadJobs)
    .where(and(eq(uploadJobs.id, jobId), eq(uploadJobs.userId, user.id)));

  if (!job) {
    throw new AppError('NOT_FOUND', 'Upload job tidak ditemukan.', 404);
  }

  if (job.status === 'completed') {
    return ok({ offset: job.fileSize, completed: true, totalSize: job.fileSize });
  }

  if (!job.resumableUri) {
    throw new AppError('VALIDATION', 'Job tidak memiliki sesi resumable.', 400);
  }

  const account = await getAccountForUser(user.id, job.googleAccountId);
  const service = await GoogleDriveService.forAccount(account);
  const offset = await service.getResumableOffset(job.resumableUri, job.fileSize);
  const completed = offset >= job.fileSize;

  if (offset !== job.uploadedBytes || completed) {
    await db
      .update(uploadJobs)
      .set({
        uploadedBytes: offset,
        ...(completed ? { status: 'completed', completedAt: new Date() } : {}),
      })
      .where(and(eq(uploadJobs.id, job.id), eq(uploadJobs.userId, user.id)));
  }

  return ok({ offset, completed, totalSize: job.fileSize });
});
