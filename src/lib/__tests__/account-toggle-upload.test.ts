import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/accounts/[id]/route';

vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgresql://gdrive:gdrive@localhost:5432/gdrive_manager';
  process.env.TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');
  process.env.BETTER_AUTH_SECRET ??= 'test-better-auth-secret-1234567890';
  process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
});

const mockDbSelect = vi.fn();
const mockDbUpdate = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => mockDbSelect(),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => mockDbUpdate(),
        }),
      }),
    }),
  },
}));

vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/rate-limit/distributed', () => ({
  rateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfterMs: 0 }),
}));

vi.mock('@/lib/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/http')>();
  return {
    ...actual,
    withAuth: (
      handler: (
        user: { id: string; email: string },
        req: NextRequest,
        ctx: { params: Promise<{ id: string }> },
      ) => Promise<Response>,
    ) => {
      return async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
        try {
          return await handler({ id: 'user-1', email: 'user@example.com' }, req, ctx);
        } catch (err) {
          return actual.errorResponse(err);
        }
      };
    },
  };
});

describe('PATCH /api/accounts/[id]', () => {
  const existingAccount = {
    id: 'acc-1',
    userId: 'user-1',
    email: 'acc1@example.com',
    isUploadEnabled: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('berhasil mengubah status isUploadEnabled menjadi false', async () => {
    mockDbSelect.mockResolvedValue([existingAccount]);
    mockDbUpdate.mockResolvedValue([{ ...existingAccount, isUploadEnabled: false }]);

    const req = new NextRequest('http://localhost:3000/api/accounts/acc-1', {
      method: 'PATCH',
      body: JSON.stringify({ isUploadEnabled: false }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'acc-1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.account.isUploadEnabled).toBe(false);
  });

  it('menolak request jika isUploadEnabled bukan boolean (400 VALIDATION)', async () => {
    const req = new NextRequest('http://localhost:3000/api/accounts/acc-1', {
      method: 'PATCH',
      body: JSON.stringify({ isUploadEnabled: 'not-a-boolean' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'acc-1' }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION');
  });

  it('mengembalikan 404 jika akun tidak ditemukan atau bukan milik user', async () => {
    mockDbSelect.mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/accounts/acc-missing', {
      method: 'PATCH',
      body: JSON.stringify({ isUploadEnabled: false }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'acc-missing' }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
