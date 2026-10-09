import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgresql://gdrive:gdrive@localhost:5432/gdrive_manager';
  process.env.TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');
  process.env.BETTER_AUTH_SECRET ??= 'test-better-auth-secret-1234567890';
  process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
  process.env.APP_URL ??= 'http://localhost:3000';
});

const mockInsert = vi.fn();
const mockFindFirst = vi.fn();

vi.mock('@/db', () => ({
  db: {
    insert: () => ({
      values: () => ({
        returning: () => mockInsert(),
      }),
    }),
    query: {
      accountConnectTokens: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
  },
}));

vi.mock('@/lib/rate-limit/distributed', () => ({
  rateLimit: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@/lib/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/http')>();
  return {
    ...actual,
    withAuth: (handler: (user: unknown, req: NextRequest, ctx: unknown) => Promise<Response>) => {
      return async (req: NextRequest, ctx: unknown) => {
        return handler({ id: 'user-1' }, req, ctx);
      };
    },
  };
});

import { POST } from '@/app/api/accounts/connect-token/route';
import { GET as validateGET } from '@/app/api/accounts/connect-token/[token]/route';
import { GET as statusGET } from '@/app/api/accounts/connect-token/[token]/status/route';

describe('Account Connect Token Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/accounts/connect-token', () => {
    it('membuat token baru dengan TTL 15 menit dan url share yang sesuai', async () => {
      const now = Date.now();
      const expiresAt = new Date(now + 15 * 60 * 1000);
      mockInsert.mockResolvedValue([
        {
          id: 'token-uuid-1',
          token: 'secure_random_token_123',
          userId: 'user-1',
          status: 'pending',
          expiresAt,
        },
      ]);

      const req = new NextRequest('http://localhost:3000/api/accounts/connect-token', {
        method: 'POST',
      });

      const res = await POST(req, undefined as unknown as void);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.token).toBe('secure_random_token_123');
      expect(json.url).toContain('/connect/secure_random_token_123');
      expect(json.expiresAt).toBe(expiresAt.toISOString());
    });
  });

  describe('GET /api/accounts/connect-token/[token] (public validation)', () => {
    it('mengembalikan valid: true jika token masih pending dan belum expired', async () => {
      const future = new Date(Date.now() + 10 * 60 * 1000);
      mockFindFirst.mockResolvedValue({
        id: 'token-1',
        token: 'valid-token',
        userId: 'user-1',
        status: 'pending',
        expiresAt: future,
      });

      const req = new NextRequest('http://localhost:3000/api/accounts/connect-token/valid-token');
      const res = await validateGET(req, { params: Promise.resolve({ token: 'valid-token' }) });
      const json = await res.json();

      expect(json.valid).toBe(true);
      expect(json.expiresAt).toBe(future.toISOString());
    });

    it('mengembalikan valid: false jika token sudah completed / used', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'token-1',
        token: 'used-token',
        status: 'completed',
        connectedEmail: 'pool@gmail.com',
        expiresAt: new Date(Date.now() + 5000),
      });

      const req = new NextRequest('http://localhost:3000/api/accounts/connect-token/used-token');
      const res = await validateGET(req, { params: Promise.resolve({ token: 'used-token' }) });
      const json = await res.json();

      expect(json.valid).toBe(false);
      expect(json.reason).toBe('already_used');
      expect(json.connectedEmail).toBe('pool@gmail.com');
    });

    it('mengembalikan valid: false jika token expired', async () => {
      const past = new Date(Date.now() - 1000);
      mockFindFirst.mockResolvedValue({
        id: 'token-1',
        token: 'expired-token',
        status: 'pending',
        expiresAt: past,
      });

      const req = new NextRequest('http://localhost:3000/api/accounts/connect-token/expired-token');
      const res = await validateGET(req, { params: Promise.resolve({ token: 'expired-token' }) });
      const json = await res.json();

      expect(json.valid).toBe(false);
      expect(json.reason).toBe('expired');
    });

    it('mengembalikan valid: false jika token tidak ditemukan', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/accounts/connect-token/not-found');
      const res = await validateGET(req, { params: Promise.resolve({ token: 'not-found' }) });
      const json = await res.json();

      expect(json.valid).toBe(false);
      expect(json.reason).toBe('not_found');
    });
  });

  describe('GET /api/accounts/connect-token/[token]/status (dashboard polling)', () => {
    it('mengembalikan status pending dan null connectedEmail', async () => {
      const future = new Date(Date.now() + 10 * 60 * 1000);
      mockFindFirst.mockResolvedValue({
        id: 'token-1',
        token: 'token-xyz',
        userId: 'user-1',
        status: 'pending',
        connectedEmail: null,
        expiresAt: future,
      });

      const req = new NextRequest(
        'http://localhost:3000/api/accounts/connect-token/token-xyz/status',
      );
      const res = await statusGET(req, {
        params: Promise.resolve({ token: 'token-xyz' }),
      });
      const json = await res.json();

      expect(json.status).toBe('pending');
      expect(json.connectedEmail).toBeNull();
    });

    it('mengembalikan status completed dan email akun yang berhasil dihubungkan', async () => {
      const future = new Date(Date.now() + 10 * 60 * 1000);
      mockFindFirst.mockResolvedValue({
        id: 'token-1',
        token: 'token-xyz',
        userId: 'user-1',
        status: 'completed',
        connectedEmail: 'pool_connected@gmail.com',
        expiresAt: future,
      });

      const req = new NextRequest(
        'http://localhost:3000/api/accounts/connect-token/token-xyz/status',
      );
      const res = await statusGET(req, {
        params: Promise.resolve({ token: 'token-xyz' }),
      });
      const json = await res.json();

      expect(json.status).toBe('completed');
      expect(json.connectedEmail).toBe('pool_connected@gmail.com');
    });
  });
});
