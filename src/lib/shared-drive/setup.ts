import { db } from '@/db';
import { googleAccounts, sharedRoots, type GoogleAccount, type SharedRoot } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { logActivity } from '@/lib/activity';
import { AppError } from '@/lib/errors';
import { shareRootToAccount } from './permissions';

export { shareRootToAccount } from './permissions';

export interface SetupStatusResult {
  isSetupDone: boolean;
  sharedRoot: SharedRoot | null;
  primaryAccount: GoogleAccount | null;
}

export async function initSharedRoot(options: {
  userId: string;
  primaryAccountId: string;
  folderName?: string;
}): Promise<{ sharedRootId: string; driveFolderId: string }> {
  // 1. Verifikasi akun milik user
  const account = await db.query.googleAccounts.findFirst({
    where: and(
      eq(googleAccounts.id, options.primaryAccountId),
      eq(googleAccounts.userId, options.userId),
    ),
  });
  if (!account) {
    throw new AppError('NOT_FOUND', 'Account not found', 404);
  }

  // 2. Set akun lain sebagai 'pool', dan akun ini sebagai 'primary'
  await db
    .update(googleAccounts)
    .set({ role: 'pool' })
    .where(and(eq(googleAccounts.userId, options.userId), eq(googleAccounts.role, 'primary')));

  await db.update(googleAccounts).set({ role: 'primary' }).where(eq(googleAccounts.id, account.id));

  // 3. Buat folder root di Google Drive akun utama
  const folderName = options.folderName?.trim() || 'GDrive Pool';
  const service = await GoogleDriveService.forAccount(account);
  const folder = await service.createSharedRootFolder(folderName);

  // 4. Simpan ke DB (sharedRoots)
  const existingRoot = await db.query.sharedRoots.findFirst({
    where: eq(sharedRoots.userId, options.userId),
  });

  let rootId: string;
  if (existingRoot) {
    const [updated] = await db
      .update(sharedRoots)
      .set({
        primaryAccountId: account.id,
        driveFolderId: folder.id,
        folderName: folder.name,
      })
      .where(eq(sharedRoots.id, existingRoot.id))
      .returning();
    rootId = updated!.id;
  } else {
    const [created] = await db
      .insert(sharedRoots)
      .values({
        userId: options.userId,
        primaryAccountId: account.id,
        driveFolderId: folder.id,
        folderName: folder.name,
      })
      .returning();
    rootId = created!.id;
  }

  // 5. Share ke semua akun pool yang sudah ada milik user
  const poolAccounts = await db.query.googleAccounts.findMany({
    where: and(eq(googleAccounts.userId, options.userId), ne(googleAccounts.id, account.id)),
  });

  for (const poolAccount of poolAccounts) {
    try {
      await shareRootToAccount(rootId, folder.id, account, poolAccount);
    } catch (shareErr) {
      console.warn(
        `[initSharedRoot] Gagal share root ke akun pool ${poolAccount.email}:`,
        shareErr instanceof Error ? shareErr.message : shareErr,
      );
    }
  }

  await logActivity({
    userId: options.userId,
    googleAccountId: account.id,
    action: 'setup.init',
    metadata: {
      folderId: folder.id,
      folderName: folder.name,
      poolAccountsShared: poolAccounts.length,
    },
  });

  return { sharedRootId: rootId, driveFolderId: folder.id };
}

export async function getSetupStatus(userId: string): Promise<SetupStatusResult> {
  const root = await db.query.sharedRoots.findFirst({
    where: eq(sharedRoots.userId, userId),
  });

  if (!root) {
    return {
      isSetupDone: false,
      sharedRoot: null,
      primaryAccount: null,
    };
  }

  const primaryAccount = await db.query.googleAccounts.findFirst({
    where: and(eq(googleAccounts.id, root.primaryAccountId), eq(googleAccounts.userId, userId)),
  });

  return {
    isSetupDone: true,
    sharedRoot: root,
    primaryAccount: primaryAccount ?? null,
  };
}
