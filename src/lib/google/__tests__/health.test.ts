import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GoogleAccount } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { checkAccountHealth } from '../health';

vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgresql://gdrive:gdrive@localhost:5432/gdrive_manager';
  process.env.TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');
});

const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockWhere = vi.fn();

vi.mock('@/db', () => ({
  db: {
    update: (...args: unknown[]) => {
      mockUpdate(...args);
      return {
        set: (...setArgs: unknown[]) => {
          mockSet(...setArgs);
          return {
            where: (...whereArgs: unknown[]) => {
              mockWhere(...whereArgs);
              return Promise.resolve();
            },
          };
        },
      };
    },
  },
}));

const mockGetStorageQuota = vi.fn();
vi.mock('@/lib/google-drive/service', () => ({
  GoogleDriveService: {
    forAccount: vi.fn().mockImplementation(() =>
      Promise.resolve({
        getStorageQuota: mockGetStorageQuota,
      }),
    ),
  },
}));

const baseAccount = {
  id: 'acc-1',
  userId: 'user-1',
  googleAccountId: 'g-1',
  email: 'acc1@gmail.com',
  name: 'Account 1',
  picture: null,
  accessToken: 'v1.access',
  refreshTokenEncrypted: 'v1.refresh',
  tokenExpiresAt: new Date(Date.now() + 3600_000),
  status: 'connected',
  role: 'pool',
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies GoogleAccount;

describe('checkAccountHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mengembalikan connected dan tidak update status jika akun sudah connected', async () => {
    mockGetStorageQuota.mockResolvedValueOnce({ totalBytes: 100, usedBytes: 50, freeBytes: 50 });
    const status = await checkAccountHealth(baseAccount);
    expect(status).toBe('connected');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('mengembalikan connected dan memulihkan status jika akun sebelumnya bukan connected', async () => {
    mockGetStorageQuota.mockResolvedValueOnce({ totalBytes: 100, usedBytes: 50, freeBytes: 50 });
    const recoveredAccount = { ...baseAccount, status: 'reconnect_required' as const };
    const status = await checkAccountHealth(recoveredAccount);
    expect(status).toBe('connected');
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'connected' }));
  });

  it('mengubah status menjadi reconnect_required jika error ACCOUNT_DISCONNECTED', async () => {
    mockGetStorageQuota.mockRejectedValueOnce(
      new AppError('ACCOUNT_DISCONNECTED', 'Akun terputus', 401),
    );
    const status = await checkAccountHealth(baseAccount);
    expect(status).toBe('reconnect_required');
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'reconnect_required' }));
  });

  it('mengubah status menjadi error jika terjadi kesalahan umum', async () => {
    mockGetStorageQuota.mockRejectedValueOnce(new Error('Network timeout'));
    const status = await checkAccountHealth(baseAccount);
    expect(status).toBe('error');
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });
});
