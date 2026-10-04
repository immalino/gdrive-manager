import { beforeEach, describe, expect, it, vi } from 'vitest';
import { syncGoogleAccountFromAuth } from '../auth-sync';

vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgresql://gdrive:gdrive@localhost:5432/gdrive_manager';
  process.env.BETTER_AUTH_SECRET ??= '12345678901234567890123456789012';
  process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
  process.env.TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');
});

const mockFindFirstUser = vi.fn();
const mockFindFirstGoogleAccount = vi.fn();
const mockFindFirstSharedRoot = vi.fn();
const mockInsertValues = vi.fn();
const mockUpdateSet = vi.fn();

vi.mock('@/db', () => ({
  db: {
    query: {
      user: {
        findFirst: (...args: unknown[]) => mockFindFirstUser(...args),
      },
      googleAccounts: {
        findFirst: (...args: unknown[]) => mockFindFirstGoogleAccount(...args),
      },
      sharedRoots: {
        findFirst: (...args: unknown[]) => mockFindFirstSharedRoot(...args),
      },
    },
    insert: () => ({
      values: (val: unknown) => {
        mockInsertValues(val);
        return {
          returning: () => Promise.resolve([{ id: 'ga-1', ...((val as object) || {}) }]),
        };
      },
    }),
    update: () => ({
      set: (val: unknown) => {
        mockUpdateSet(val);
        return {
          where: () => ({
            returning: () =>
              Promise.resolve([
                { id: 'ga-existing', email: 'test@gmail.com', ...((val as object) || {}) },
              ]),
          }),
        };
      },
    }),
  },
}));

vi.mock('@/lib/quota', () => ({
  syncQuota: vi.fn().mockResolvedValue(undefined),
}));

const mockInitSharedRoot = vi.fn();
vi.mock('@/lib/shared-drive/setup', () => ({
  initSharedRoot: (...args: unknown[]) => mockInitSharedRoot(...args),
}));

vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

describe('syncGoogleAccountFromAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mengabaikan provider selain google', async () => {
    const result = await syncGoogleAccountFromAuth({
      userId: 'u1',
      accountId: 'acc1',
      providerId: 'github',
    });
    expect(result).toBeNull();
  });

  it('menyimpan akun Google baru otomatis sebagai primary dan membuat Shared Root', async () => {
    mockFindFirstUser.mockResolvedValueOnce({
      id: 'u1',
      email: 'user@gmail.com',
      name: 'User Test',
      image: 'https://example.com/avatar.jpg',
    });
    // existingAccount -> null
    mockFindFirstGoogleAccount.mockResolvedValueOnce(null);
    // existingPrimary -> null
    mockFindFirstGoogleAccount.mockResolvedValueOnce(null);
    // existingRoot -> null
    mockFindFirstSharedRoot.mockResolvedValueOnce(null);
    mockInitSharedRoot.mockResolvedValueOnce({ sharedRootId: 'sr-1', driveFolderId: 'f-1' });

    const result = await syncGoogleAccountFromAuth({
      userId: 'u1',
      accountId: 'google-sub-123',
      providerId: 'google',
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      accessTokenExpiresAt: new Date(Date.now() + 3600_000),
    });

    expect(result).toBeDefined();
    expect(result?.role).toBe('primary');
    expect(result?.email).toBe('user@gmail.com');
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        googleAccountId: 'google-sub-123',
        email: 'user@gmail.com',
        role: 'primary',
        status: 'connected',
      }),
    );
    expect(mockInitSharedRoot).toHaveBeenCalledWith({
      userId: 'u1',
      primaryAccountId: 'ga-1',
      folderName: 'GDrive Pool',
    });
  });

  it('menyimpan akun Google kedua sebagai role pool jika akun primary sudah ada', async () => {
    mockFindFirstUser.mockResolvedValueOnce({
      id: 'u1',
      email: 'user2@gmail.com',
      name: 'Second Account',
      image: null,
    });
    // existingAccount -> null
    mockFindFirstGoogleAccount.mockResolvedValueOnce(null);
    // existingPrimary -> already exists!
    mockFindFirstGoogleAccount.mockResolvedValueOnce({
      id: 'ga-primary',
      role: 'primary',
    });

    const result = await syncGoogleAccountFromAuth({
      userId: 'u1',
      accountId: 'google-sub-456',
      providerId: 'google',
      accessToken: 'access-token-456',
      refreshToken: 'refresh-token-456',
    });

    expect(result).toBeDefined();
    expect(result?.role).toBe('pool');
    expect(mockInitSharedRoot).not.toHaveBeenCalled();
  });

  it('memperbarui token pada akun yang sudah pernah terhubung', async () => {
    mockFindFirstUser.mockResolvedValueOnce({
      id: 'u1',
      email: 'user@gmail.com',
      name: 'User Updated',
      image: null,
    });
    // existingAccount -> exists
    mockFindFirstGoogleAccount.mockResolvedValueOnce({
      id: 'ga-existing',
      role: 'primary',
      name: 'Old Name',
    });
    // existingPrimary -> exists
    mockFindFirstGoogleAccount.mockResolvedValueOnce({
      id: 'ga-existing',
      role: 'primary',
    });
    // existingRoot -> exists
    mockFindFirstSharedRoot.mockResolvedValueOnce({
      id: 'sr-1',
    });

    const result = await syncGoogleAccountFromAuth({
      userId: 'u1',
      accountId: 'google-sub-123',
      providerId: 'google',
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    expect(result).toBeDefined();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'connected',
      }),
    );
  });
});

