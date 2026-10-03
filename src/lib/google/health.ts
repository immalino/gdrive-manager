import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleAccounts, type GoogleAccount } from '@/db/schema';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { AppError } from '@/lib/errors';

export type HealthStatus = 'connected' | 'reconnect_required' | 'error';

export async function checkAccountHealth(account: GoogleAccount): Promise<HealthStatus> {
  try {
    const service = await GoogleDriveService.forAccount(account);
    await service.getStorageQuota();
    if (account.status !== 'connected') {
      await db
        .update(googleAccounts)
        .set({ status: 'connected', updatedAt: new Date() })
        .where(eq(googleAccounts.id, account.id));
    }
    return 'connected';
  } catch (error) {
    const status: HealthStatus =
      error instanceof AppError && error.code === 'ACCOUNT_DISCONNECTED'
        ? 'reconnect_required'
        : 'error';
    await db
      .update(googleAccounts)
      .set({ status, updatedAt: new Date() })
      .where(eq(googleAccounts.id, account.id));
    return status;
  }
}
