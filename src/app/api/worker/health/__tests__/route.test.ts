import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgresql://gdrive:gdrive@localhost:5432/gdrive_manager';
  process.env.TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');
  process.env.BETTER_AUTH_SECRET ??= 'test-better-auth-secret-1234567890';
  process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
});

import { GET } from '@/app/api/worker/health/route';

const mockReq = new NextRequest('http://localhost:3000/api/worker/health');

const mockSelect = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        orderBy: () => ({
          limit: () => mockSelect(),
        }),
      }),
    }),
  },
}));

vi.mock('@/lib/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/http')>();
  return {
    ...actual,
    withAuth: (handler: (user: unknown) => Promise<Response>) => {
      return async () => {
        return handler({ id: 'user-1' });
      };
    },
  };
});

describe('GET /api/worker/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mengembalikan status stopped jika belum ada record heartbeat', async () => {
    mockSelect.mockResolvedValue([]);

    const res = await GET(mockReq);
    const data = await res.json();

    expect(data.status).toBe('stopped');
    expect(data.lastHeartbeat).toBeNull();
    expect(data.elapsedSeconds).toBeNull();
  });

  it('mengembalikan status active jika heartbeat diterima dalam 60 detik terakhir', async () => {
    const recent = new Date(Date.now() - 15_000);
    mockSelect.mockResolvedValue([
      {
        id: 'worker-main',
        service: 'background-worker',
        lastHeartbeat: recent,
        status: 'active',
      },
    ]);

    const res = await GET(mockReq);
    const data = await res.json();

    expect(data.status).toBe('active');
    expect(data.elapsedSeconds).toBe(15);
  });

  it('mengembalikan status stale jika heartbeat berusia antara 60s hingga 180s', async () => {
    const staleTime = new Date(Date.now() - 100_000);
    mockSelect.mockResolvedValue([
      {
        id: 'worker-main',
        service: 'background-worker',
        lastHeartbeat: staleTime,
        status: 'active',
      },
    ]);

    const res = await GET(mockReq);
    const data = await res.json();

    expect(data.status).toBe('stale');
    expect(data.elapsedSeconds).toBe(100);
  });

  it('mengembalikan status stopped jika heartbeat lebih dari 180 detik lalu', async () => {
    const deadTime = new Date(Date.now() - 250_000);
    mockSelect.mockResolvedValue([
      {
        id: 'worker-main',
        service: 'background-worker',
        lastHeartbeat: deadTime,
        status: 'active',
      },
    ]);

    const res = await GET(mockReq);
    const data = await res.json();

    expect(data.status).toBe('stopped');
    expect(data.elapsedSeconds).toBe(250);
  });
});
