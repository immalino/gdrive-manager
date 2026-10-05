import { db } from '@/db';
import { sharedPermissions, type GoogleAccount, type SharedPermission } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { GoogleDriveService } from '@/lib/google-drive/service';

export async function shareRootToAccount(
  sharedRootId: string,
  driveFolderId: string,
  primaryAccount: GoogleAccount,
  poolAccount: GoogleAccount,
): Promise<SharedPermission> {
  const service = await GoogleDriveService.forAccount(primaryAccount);
  let permId: string | undefined;

  // Cek apakah permission sudah ada di Google Drive (misal folder yang sudah ada/sebelumnya sudah di-share)
  try {
    const existingPerms = await service.listPermissions(driveFolderId);
    const matched = existingPerms.find(
      (p) => p.emailAddress?.toLowerCase() === poolAccount.email.toLowerCase(),
    );
    if (matched) {
      permId = matched.id;
    }
  } catch (err) {
    console.warn('[shareRootToAccount] listPermissions failed, will attempt shareFolder', err);
  }

  if (!permId) {
    try {
      permId = await service.shareFolder(driveFolderId, poolAccount.email, 'writer');
    } catch (shareErr) {
      // Jika Google Drive mengembalikan error bahwa permission sudah ada
      const existingPerms = await service.listPermissions(driveFolderId).catch(() => []);
      const matched = existingPerms.find(
        (p) => p.emailAddress?.toLowerCase() === poolAccount.email.toLowerCase(),
      );
      if (matched) {
        permId = matched.id;
      } else {
        throw shareErr;
      }
    }
  }

  // Check if a permission record already exists for this root & account
  const existing = await db.query.sharedPermissions.findFirst({
    where: and(
      eq(sharedPermissions.sharedRootId, sharedRootId),
      eq(sharedPermissions.googleAccountId, poolAccount.id),
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(sharedPermissions)
      .set({
        drivePermissionId: permId,
        status: 'active',
      })
      .where(eq(sharedPermissions.id, existing.id))
      .returning();
    return updated!;
  }

  const [created] = await db
    .insert(sharedPermissions)
    .values({
      sharedRootId,
      googleAccountId: poolAccount.id,
      drivePermissionId: permId,
      status: 'active',
    })
    .returning();

  return created!;
}

export async function revokeRootFromAccount(
  sharedRootId: string,
  driveFolderId: string,
  primaryAccount: GoogleAccount,
  poolAccountId: string,
): Promise<void> {
  const perm = await db.query.sharedPermissions.findFirst({
    where: and(
      eq(sharedPermissions.sharedRootId, sharedRootId),
      eq(sharedPermissions.googleAccountId, poolAccountId),
    ),
  });

  if (!perm) return;

  const service = await GoogleDriveService.forAccount(primaryAccount);
  try {
    await service.revokePermission(driveFolderId, perm.drivePermissionId);
  } catch (err) {
    console.warn('[revokeRootFromAccount] Google API revoke error', err);
  }

  await db
    .update(sharedPermissions)
    .set({ status: 'revoked' })
    .where(eq(sharedPermissions.id, perm.id));
}
