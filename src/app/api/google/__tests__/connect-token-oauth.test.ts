import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgresql://gdrive:gdrive@localhost:5432/gdrive_manager';
  process.env.TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');
  process.env.BETTER_AUTH_SECRET ??= 'test-better-auth-secret-1234567890';
  process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
  process.env.GOOGLE_CLIENT_ID ??= 'test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET ??= 'test-google-client-secret';
  process.env.GOOGLE_REDIRECT_URI ??= 'http://localhost:3000/api/google/callback';
});

const mockFindFirstToken = vi.fn();
const mockFindFirstAccount = vi.fn();
const mockFindFirstSharedRoot = vi.fn();
const mockInsertAccount = vi.fn();

vi.mock('@/db', () => ({
  db: {
    query: {
      accountConnectTokens: {
        findFirst: (...args: unknown[]) => mockFindFirstToken(...args),
      },
      googleAccounts: {
        findFirst: (...args: unknown[]) => mockFindFirstAccount(...args),
      },
      sharedRoots: {
        findFirst: (...args: unknown[]) => mockFindFirstSharedRoot(...args),
      },
    },
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([]),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: () => mockInsertAccount(),
        }),
        returning: () => mockInsertAccount(),
      }),
    }),
  },
}));

vi.mock('@/lib/google/oauth', () => ({
  buildAuthUrl: vi.fn((state: string) => `https://accounts.google.com/oauth?state=${state}`),
  exchangeCode: vi.fn().mockResolvedValue({
    access_token: 'google-access-token-123',
    refresh_token: 'google-refresh-token-456',
    expires_in: 3600,
  }),
  fetchUserInfo: vi.fn().mockResolvedValue({
    sub: 'google-sub-789',
    email: 'pooluser@example.com',
    name: 'Pool User',
    picture: 'https://example.com/avatar.jpg',
  }),
}));

vi.mock('@/lib/quota', () => ({
  syncQuota: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/shared-drive/permissions', () => ({
  shareRootToAccount: vi.fn().mockResolvedValue({ drivePermissionId: 'perm-999' }),
}));

import { GET as connectGET } from '@/app/api/google/connect/route';
import { GET as callbackGET } from '@/app/api/google/callback/route';

describe('Google OAuth with Connect Token Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/google/connect?token=...', () => {
    it('mengarahkan ke Google OAuth dengan connectToken di dalam state jika token valid', async () => {
      const future = new Date(Date.now() + 10 * 60 * 1000);
      mockFindFirstToken.mockResolvedValue({
        id: 'token-uuid-1',
        token: 'token-share-123',
        userId: 'user-owner-1',
        status: 'pending',
        expiresAt: future,
      });

      const req = new NextRequest('http://localhost:3000/api/google/connect?token=token-share-123');
      const res = await connectGET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('https://accounts.google.com/oauth?state=');

      // Verify cookie g_oauth_state
      const cookie = res.cookies.get('g_oauth_state');
      expect(cookie).toBeDefined();
      const stateObj = JSON.parse(cookie!.value);
      expect(stateObj.connectToken).toBe('token-share-123');
      expect(stateObj.userId).toBe('user-owner-1');
    });

    it('redirects ke /connect/[token]?error=invalid jika token kadaluarsa atau tidak ada di DB', async () => {
      mockFindFirstToken.mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/google/connect?token=invalid-token');
      const res = await connectGET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/connect/invalid-token?error=invalid');
    });
  });

  describe('GET /api/google/callback with connectToken', () => {
    it('memproses otorisasi Google dan mengarahkan ke /connect/success jika state connectToken valid', async () => {
      const future = new Date(Date.now() + 10 * 60 * 1000);
      mockFindFirstToken.mockResolvedValue({
        id: 'token-uuid-1',
        token: 'token-share-123',
        userId: 'user-owner-1',
        status: 'pending',
        expiresAt: future,
      });

      // Primary account sudah ada, maka akun baru menjadi pool
      mockFindFirstAccount.mockResolvedValue({
        id: 'primary-acc-1',
        userId: 'user-owner-1',
        role: 'primary',
      });

      mockFindFirstSharedRoot.mockResolvedValue(null);

      mockInsertAccount.mockResolvedValue([
        {
          id: 'acc-pool-new',
          userId: 'user-owner-1',
          email: 'pooluser@example.com',
          role: 'pool',
          status: 'connected',
        },
      ]);

      const stateStr = JSON.stringify({
        nonce: 'nonce-123',
        connectToken: 'token-share-123',
        userId: 'user-owner-1',
      });

      const req = new NextRequest(
        `http://localhost:3000/api/google/callback?code=mock-code&state=${encodeURIComponent(stateStr)}`,
      );
      req.cookies.set('g_oauth_state', stateStr);

      const res = await callbackGET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain(
        `/connect/success?email=${encodeURIComponent('pooluser@example.com')}`,
      );
    });

    it('redirects ke /connect/[token]?error=invalid_state jika connectToken di state tidak ditemukan di DB', async () => {
      mockFindFirstToken.mockResolvedValue(null);

      const stateStr = JSON.stringify({
        nonce: 'nonce-123',
        connectToken: 'token-not-found',
        userId: 'user-owner-1',
      });

      const req = new NextRequest(
        `http://localhost:3000/api/google/callback?code=mock-code&state=${encodeURIComponent(stateStr)}`,
      );

      const res = await callbackGET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/connect/token-not-found?error=invalid_state');
    });
  });
});
