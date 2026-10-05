import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GoogleAccount } from '@/db/schema';
import { getSetupStatus, initSharedRoot } from '@/lib/shared-drive/setup';
import { shareRootToAccount } from '@/lib/shared-drive/permissions';

vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgresql://gdrive:gdrive@localhost:5432/gdrive_manager';
  process.env.TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');
});

const mockFindFirstSharedRoot = vi.fn();
const mockFindFirstAccount = vi.fn();
const mockFindManyAccounts = vi.fn();
const mockFindFirstPermission = vi.fn();

const mockUpdate = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/db', () => ({
  db: {
    query: {
      sharedRoots: {
        findFirst: (...args: unknown[]) => mockFindFirstSharedRoot(...args),
      },
      googleAccounts: {
        findFirst: (...args: unknown[]) => mockFindFirstAccount(...args),
        findMany: (...args: unknown[]) => mockFindManyAccounts(...args),
      },
      sharedPermissions: {
        findFirst: (...args: unknown[]) => mockFindFirstPermission(...args),
      },
    },
    update: (...args: unknown[]) => {
      mockUpdate(...args);
      return {
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve([{ id: 'root-1', folderName: 'GDrive Pool' }]),
          }),
        }),
      };
    },
    insert: (...args: unknown[]) => {
      mockInsert(...args);
      return {
        values: () => ({
          returning: () =>
            Promise.resolve([
              {
                id: 'perm-1',
                sharedRootId: 'root-1',
                googleAccountId: 'acc-2',
                drivePermissionId: 'perm-drive-xyz',
                status: 'active',
              },
            ]),
        }),
      };
    },
  },
}));

const mockCreateSharedRootFolder = vi.fn();
const mockShareFolder = vi.fn();
const mockListPermissions = vi.fn();
const mockGetFile = vi.fn();

vi.mock('@/lib/google-drive/service', () => ({
  GoogleDriveService: {
    forAccount: vi.fn().mockImplementation(() =>
      Promise.resolve({
        createSharedRootFolder: mockCreateSharedRootFolder,
        shareFolder: mockShareFolder,
        listPermissions: mockListPermissions,
        getFile: mockGetFile,
      }),
    ),
  },
}));

vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

const primaryAccount: GoogleAccount = {
  id: 'acc-primary',
  userId: 'user-1',
  googleAccountId: 'g-1',
  email: 'primary@gmail.com',
  name: 'Primary Account',
  picture: null,
  accessToken: 'v1.enc',
  refreshTokenEncrypted: 'v1.enc',
  tokenExpiresAt: new Date(Date.now() + 3600_000),
  status: 'connected',
  role: 'primary',
  isUploadEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const poolAccount: GoogleAccount = {
  id: 'acc-pool-1',
  userId: 'user-1',
  googleAccountId: 'g-2',
  email: 'pool1@gmail.com',
  name: 'Pool 1',
  picture: null,
  accessToken: 'v1.enc',
  refreshTokenEncrypted: 'v1.enc',
  tokenExpiresAt: new Date(Date.now() + 3600_000),
  status: 'connected',
  role: 'pool',
  isUploadEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('shared-drive setup & permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPermissions.mockResolvedValue([]);
  });

  describe('getSetupStatus', () => {
    it('mengembalikan isSetupDone: false jika belum ada shared root', async () => {
      mockFindFirstSharedRoot.mockResolvedValueOnce(null);

      const status = await getSetupStatus('user-1');
      expect(status.isSetupDone).toBe(false);
      expect(status.sharedRoot).toBeNull();
      expect(status.primaryAccount).toBeNull();
    });

    it('mengembalikan isSetupDone: true jika shared root dan primary account ditemukan', async () => {
      const fakeRoot = {
        id: 'root-123',
        userId: 'user-1',
        primaryAccountId: 'acc-primary',
        driveFolderId: 'folder-root-drive-id',
        folderName: 'GDrive Pool',
        createdAt: new Date(),
      };
      mockFindFirstSharedRoot.mockResolvedValueOnce(fakeRoot);
      mockFindFirstAccount.mockResolvedValueOnce(primaryAccount);

      const status = await getSetupStatus('user-1');
      expect(status.isSetupDone).toBe(true);
      expect(status.sharedRoot).toEqual(fakeRoot);
      expect(status.primaryAccount).toEqual(primaryAccount);
    });
  });

  describe('initSharedRoot', () => {
    it('membuat root folder baru, simpan ke db, dan share ke pool accounts', async () => {
      mockFindFirstAccount.mockResolvedValueOnce(primaryAccount);
      mockCreateSharedRootFolder.mockResolvedValueOnce({
        id: 'drive-folder-999',
        name: 'GDrive Pool',
      });
      mockFindFirstSharedRoot.mockResolvedValueOnce(null);
      mockFindManyAccounts.mockResolvedValueOnce([poolAccount]);
      mockShareFolder.mockResolvedValueOnce('drive-perm-999');
      mockFindFirstPermission.mockResolvedValueOnce(null);

      const result = await initSharedRoot({
        userId: 'user-1',
        primaryAccountId: 'acc-primary',
        folderName: 'GDrive Pool',
      });

      expect(result.driveFolderId).toBe('drive-folder-999');
      expect(mockCreateSharedRootFolder).toHaveBeenCalledWith('GDrive Pool');
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
      expect(mockShareFolder).toHaveBeenCalledWith('drive-folder-999', poolAccount.email, 'writer');
    });

    it('menggunakan existingFolderId jika disediakan tanpa membuat folder baru', async () => {
      mockFindFirstAccount.mockResolvedValueOnce(primaryAccount);
      mockGetFile.mockResolvedValueOnce({
        id: 'existing-folder-id-123',
        name: 'Existing Shared Folder',
        mimeType: 'application/vnd.google-apps.folder',
      });
      mockFindFirstSharedRoot.mockResolvedValueOnce(null);
      mockFindManyAccounts.mockResolvedValueOnce([poolAccount]);
      mockShareFolder.mockResolvedValueOnce('drive-perm-999');
      mockFindFirstPermission.mockResolvedValueOnce(null);

      const result = await initSharedRoot({
        userId: 'user-1',
        primaryAccountId: 'acc-primary',
        existingFolderId: 'existing-folder-id-123',
      });

      expect(result.driveFolderId).toBe('existing-folder-id-123');
      expect(mockCreateSharedRootFolder).not.toHaveBeenCalled();
      expect(mockGetFile).toHaveBeenCalledWith('existing-folder-id-123');
      expect(mockShareFolder).toHaveBeenCalledWith(
        'existing-folder-id-123',
        poolAccount.email,
        'writer',
      );
    });

    it('throw 400 jika existingFolderId bukan folder (misalnya file biasa)', async () => {
      mockFindFirstAccount.mockResolvedValueOnce(primaryAccount);
      mockGetFile.mockResolvedValueOnce({
        id: 'file-id-123',
        name: 'document.pdf',
        mimeType: 'application/pdf',
      });

      await expect(
        initSharedRoot({
          userId: 'user-1',
          primaryAccountId: 'acc-primary',
          existingFolderId: 'file-id-123',
        }),
      ).rejects.toThrow('Item yang dipilih bukan merupakan folder Google Drive.');
    });

    it('throw 404 jika primary account tidak ditemukan atau bukan milik user', async () => {
      mockFindFirstAccount.mockResolvedValueOnce(null);

      await expect(
        initSharedRoot({
          userId: 'user-1',
          primaryAccountId: 'acc-nonexistent',
        }),
      ).rejects.toThrow('Account not found');
    });
  });

  describe('shareRootToAccount', () => {
    it('memanggil GoogleDriveService.shareFolder dan mencatat ke sharedPermissions jika permission belum ada', async () => {
      mockListPermissions.mockResolvedValueOnce([]);
      mockShareFolder.mockResolvedValueOnce('perm-new-id');
      mockFindFirstPermission.mockResolvedValueOnce(null);

      const res = await shareRootToAccount('root-1', 'folder-1', primaryAccount, poolAccount);
      expect(mockShareFolder).toHaveBeenCalledWith('folder-1', poolAccount.email, 'writer');
      expect(mockInsert).toHaveBeenCalled();
      expect(res.drivePermissionId).toBe('perm-drive-xyz');
    });

    it('menggunakan permission yang sudah ada jika pool account sudah memiliki akses', async () => {
      mockListPermissions.mockResolvedValueOnce([
        { id: 'perm-existing-123', emailAddress: poolAccount.email, role: 'writer', type: 'user' },
      ]);
      mockFindFirstPermission.mockResolvedValueOnce(null);

      await shareRootToAccount('root-1', 'folder-1', primaryAccount, poolAccount);
      expect(mockShareFolder).not.toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
    });
  });
});
