import { describe, expect, it, vi, beforeEach } from 'vitest';
import { verifySharedRoot } from '../shared-drive/integrity';
import { googleAccounts, sharedPermissions, type SharedRoot } from '@/db/schema';

// Mock DB
const mockFindFirstAccount = vi.fn();
const mockSelectAccounts = vi.fn();
const mockSelectPerms = vi.fn();
const mockUpdatePerms = vi.fn();

vi.mock('@/db', () => ({
  db: {
    query: {
      googleAccounts: {
        findFirst: (...args: unknown[]) => mockFindFirstAccount(...args),
      },
    },
    select: () => ({
      from: (table: unknown) => ({
        where: () => {
          if (table === googleAccounts) {
            return mockSelectAccounts();
          }
          if (table === sharedPermissions) {
            return mockSelectPerms();
          }
          return Promise.resolve([]);
        },
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => mockUpdatePerms(),
      }),
    }),
  },
}));

// Mock GoogleDriveService
const mockGetFile = vi.fn();
const mockListPermissions = vi.fn();

vi.mock('@/lib/google-drive/service', () => ({
  GoogleDriveService: {
    forAccount: vi.fn().mockImplementation(async () => ({
      getFile: mockGetFile,
      listPermissions: mockListPermissions,
    })),
  },
}));

// Mock permissions share
const mockShareRootToAccount = vi.fn();
vi.mock('../shared-drive/permissions', () => ({
  shareRootToAccount: (...args: unknown[]) => mockShareRootToAccount(...args),
}));

// Mock activity
vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn(),
}));

describe('verifySharedRoot integrity', () => {
  const dummyRoot: SharedRoot = {
    id: 'root-1',
    userId: 'user-1',
    primaryAccountId: 'acc-primary',
    driveFolderId: 'folder-root-drive-id',
    folderName: 'GDrive Pool',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mengembalikan status primary_unavailable jika primary account tidak ditemukan atau error', async () => {
    mockFindFirstAccount.mockResolvedValueOnce(null);

    const res = await verifySharedRoot(dummyRoot);
    expect(res.status).toBe('primary_unavailable');
    expect(res.details[0]).toContain('tidak ditemukan');
  });

  it('mengembalikan status root_missing jika folder root tidak ditemukan di Drive', async () => {
    mockFindFirstAccount.mockResolvedValueOnce({
      id: 'acc-primary',
      email: 'primary@example.com',
      status: 'connected',
    });
    mockGetFile.mockRejectedValueOnce(new Error('File not found 404'));

    const res = await verifySharedRoot(dummyRoot);
    expect(res.status).toBe('root_missing');
    expect(res.details[0]).toContain('tidak ditemukan di Google Drive');
  });

  it('mengembalikan status ok jika folder ada dan seluruh permission pool aktif', async () => {
    mockFindFirstAccount.mockResolvedValueOnce({
      id: 'acc-primary',
      email: 'primary@example.com',
      status: 'connected',
    });
    mockGetFile.mockResolvedValueOnce({ id: 'folder-root-drive-id', name: 'GDrive Pool' });
    mockListPermissions.mockResolvedValueOnce([
      { id: 'perm-primary', emailAddress: 'primary@example.com', role: 'owner', type: 'user' },
      { id: 'perm-pool-1', emailAddress: 'pool1@example.com', role: 'writer', type: 'user' },
    ]);
    mockSelectAccounts.mockResolvedValueOnce([
      { id: 'acc-pool-1', email: 'pool1@example.com', status: 'connected' },
    ]);
    mockSelectPerms.mockResolvedValueOnce([
      {
        id: 'sp-1',
        googleAccountId: 'acc-pool-1',
        drivePermissionId: 'perm-pool-1',
        status: 'active',
      },
    ]);

    const res = await verifySharedRoot(dummyRoot);
    expect(res.status).toBe('ok');
    expect(res.resharedCount).toBe(0);
    expect(mockShareRootToAccount).not.toHaveBeenCalled();
  });

  it('melakukan auto-reshare jika permission akun pool hilang dari Google Drive', async () => {
    mockFindFirstAccount.mockResolvedValueOnce({
      id: 'acc-primary',
      email: 'primary@example.com',
      status: 'connected',
    });
    mockGetFile.mockResolvedValueOnce({ id: 'folder-root-drive-id', name: 'GDrive Pool' });
    // Google permissions hanya punya primary, pool1 hilang
    mockListPermissions.mockResolvedValueOnce([
      { id: 'perm-primary', emailAddress: 'primary@example.com', role: 'owner', type: 'user' },
    ]);
    mockSelectAccounts.mockResolvedValueOnce([
      { id: 'acc-pool-1', email: 'pool1@example.com', status: 'connected' },
    ]);
    mockSelectPerms.mockResolvedValueOnce([
      {
        id: 'sp-1',
        googleAccountId: 'acc-pool-1',
        drivePermissionId: 'perm-pool-old',
        status: 'active',
      },
    ]);
    mockShareRootToAccount.mockResolvedValueOnce({
      id: 'sp-1',
      drivePermissionId: 'perm-pool-new',
      status: 'active',
    });

    const res = await verifySharedRoot(dummyRoot);
    expect(res.status).toBe('repaired');
    expect(res.resharedCount).toBe(1);
    expect(mockShareRootToAccount).toHaveBeenCalledTimes(1);
  });
});
