import { db } from '@/db';
import { googleAccounts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { ok, withAuth } from '@/lib/http';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { getSetupStatus } from '@/lib/shared-drive/setup';
import { getFolderBreadcrumb } from '@/lib/shared-drive/breadcrumb';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (user, req, ctx) => {
  const { id } = await ctx.params;
  const { isSetupDone, sharedRoot, primaryAccount } = await getSetupStatus(user.id);

  if (!isSetupDone || !sharedRoot) {
    throw new AppError('NOT_FOUND', 'Shared root belum diinisialisasi.', 404);
  }

  let account = primaryAccount;
  if (!account) {
    account =
      (await db.query.googleAccounts.findFirst({
        where: eq(googleAccounts.userId, user.id),
      })) ?? null;
  }

  if (!account) {
    throw new AppError('NOT_FOUND', 'Tidak ada akun Google yang terhubung.', 404);
  }

  const service = await GoogleDriveService.forAccount(account);
  const result = await getFolderBreadcrumb(
    service,
    sharedRoot.driveFolderId,
    id,
    sharedRoot.folderName || 'My Drive',
  );

  return ok({
    currentFolder: result.currentFolder,
    breadcrumb: result.breadcrumb,
  });
});
