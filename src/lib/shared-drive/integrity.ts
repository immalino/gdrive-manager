import { db } from '@/db';
import { googleAccounts, sharedPermissions, sharedRoots, type SharedRoot } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { shareRootToAccount } from './permissions';
import { logActivity } from '@/lib/activity';

export interface IntegrityCheckResult {
  sharedRootId: string;
  folderId: string;
  userId: string;
  status: 'ok' | 'root_missing' | 'primary_unavailable' | 'repaired';
  resharedCount: number;
  details: string[];
}

export async function verifySharedRoot(sharedRoot: SharedRoot): Promise<IntegrityCheckResult> {
  const result: IntegrityCheckResult = {
    sharedRootId: sharedRoot.id,
    folderId: sharedRoot.driveFolderId,
    userId: sharedRoot.userId,
    status: 'ok',
    resharedCount: 0,
    details: [],
  };

  // 1. Ambil primary account
  const primaryAccount = await db.query.googleAccounts.findFirst({
    where: and(
      eq(googleAccounts.id, sharedRoot.primaryAccountId),
      eq(googleAccounts.userId, sharedRoot.userId),
    ),
  });

  if (!primaryAccount || primaryAccount.status !== 'connected') {
    result.status = 'primary_unavailable';
    result.details.push(
      `Primary account ${sharedRoot.primaryAccountId} tidak ditemukan atau tidak terhubung.`,
    );
    console.warn(`[integrity] ${result.details[0]}`);
    return result;
  }

  let service: GoogleDriveService;
  try {
    service = await GoogleDriveService.forAccount(primaryAccount);
  } catch (err) {
    result.status = 'primary_unavailable';
    result.details.push(
      `Gagal menginisialisasi service primary account: ${err instanceof Error ? err.message : err}`,
    );
    console.warn(`[integrity] ${result.details[0]}`);
    return result;
  }

  // 2. Cek apakah folder root masih ada di Google Drive
  try {
    await service.getFile(sharedRoot.driveFolderId);
  } catch (err) {
    result.status = 'root_missing';
    result.details.push(`Folder root ${sharedRoot.driveFolderId} tidak ditemukan di Google Drive!`);
    console.error(`[integrity] ALERT: ${result.details[0]}`);
    await logActivity({
      userId: sharedRoot.userId,
      googleAccountId: primaryAccount.id,
      action: 'root.missing',
      metadata: {
        folderId: sharedRoot.driveFolderId,
        error: err instanceof Error ? err.message : String(err),
      },
    });
    return result;
  }

  // 3. Ambil permission aktif dari Google Drive
  let googlePerms: Array<{ id: string; emailAddress?: string; role: string; type: string }>;
  try {
    googlePerms = await service.listPermissions(sharedRoot.driveFolderId);
  } catch (err) {
    result.details.push(
      `Gagal mengambil permissions folder root: ${err instanceof Error ? err.message : err}`,
    );
    console.warn(`[integrity] ${result.details[0]}`);
    return result;
  }

  // 4. Ambil semua akun pool yang terhubung
  const poolAccounts = await db
    .select()
    .from(googleAccounts)
    .where(
      and(
        eq(googleAccounts.userId, sharedRoot.userId),
        ne(googleAccounts.id, sharedRoot.primaryAccountId),
        eq(googleAccounts.status, 'connected'),
      ),
    );

  // Ambil record shared_permissions lokal
  const localPerms =
    (await db
      .select()
      .from(sharedPermissions)
      .where(eq(sharedPermissions.sharedRootId, sharedRoot.id))) ?? [];

  for (const poolAccount of poolAccounts) {
    const recordedPerm = localPerms.find((p) => p.googleAccountId === poolAccount.id);

    // Cek apakah permission pool account ini ada di Google Drive
    const hasGooglePerm = googlePerms.some((gp) => {
      if (gp.emailAddress && gp.emailAddress.toLowerCase() === poolAccount.email.toLowerCase()) {
        return true;
      }
      if (recordedPerm && gp.id === recordedPerm.drivePermissionId) {
        return true;
      }
      return false;
    });

    if (!hasGooglePerm) {
      console.warn(
        `[integrity] Permission untuk ${poolAccount.email} hilang dari root ${sharedRoot.driveFolderId}. Melakukan auto-reshare...`,
      );
      try {
        const newPerm = await shareRootToAccount(
          sharedRoot.id,
          sharedRoot.driveFolderId,
          primaryAccount,
          poolAccount,
        );
        result.resharedCount++;
        result.status = 'repaired';
        result.details.push(
          `Auto-reshare berhasil untuk ${poolAccount.email} (id: ${newPerm.drivePermissionId})`,
        );
        console.log(`[integrity] ${result.details[result.details.length - 1]}`);

        await logActivity({
          userId: sharedRoot.userId,
          googleAccountId: poolAccount.id,
          action: 'root.reshare',
          metadata: {
            folderId: sharedRoot.driveFolderId,
            poolEmail: poolAccount.email,
            permissionId: newPerm.drivePermissionId,
            reason: 'auto_repair',
          },
        });
      } catch (shareErr) {
        result.details.push(
          `Gagal auto-reshare ${poolAccount.email}: ${shareErr instanceof Error ? shareErr.message : shareErr}`,
        );
        console.error(`[integrity] ${result.details[result.details.length - 1]}`);
      }
    } else if (recordedPerm && recordedPerm.status !== 'active') {
      // Perbarui status lokal jika sebelumnya tidak aktif tapi ternyata ada di Google
      await db
        .update(sharedPermissions)
        .set({ status: 'active' })
        .where(eq(sharedPermissions.id, recordedPerm.id));
    }
  }

  if (result.status === 'ok') {
    result.details.push('Root folder OK dan seluruh permission pool aktif.');
    console.log(
      `[integrity] Root folder OK untuk user ${sharedRoot.userId} (${sharedRoot.driveFolderId})`,
    );
    await logActivity({
      userId: sharedRoot.userId,
      googleAccountId: primaryAccount.id,
      action: 'root.integrity_checked',
      metadata: {
        folderId: sharedRoot.driveFolderId,
        status: 'ok',
        verifiedAccounts: poolAccounts.length,
      },
    });
  }

  return result;
}

export async function verifyAllSharedRoots(): Promise<IntegrityCheckResult[]> {
  const roots = await db.select().from(sharedRoots);
  const results: IntegrityCheckResult[] = [];
  for (const root of roots) {
    try {
      const res = await verifySharedRoot(root);
      results.push(res);
    } catch (err) {
      console.error(`[integrity] Gagal verifikasi shared root ${root.id}:`, err);
    }
  }
  return results;
}
