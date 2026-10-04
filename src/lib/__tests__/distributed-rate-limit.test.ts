import { beforeEach, describe, expect, it, vi } from 'vitest';
import { distributedRateLimit } from '@/lib/rate-limit/distributed';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => mockSelect(),
        }),
      }),
    }),
    insert: () => ({
      values: (...args: unknown[]) => mockInsert(...args),
    }),
    delete: () => ({
      where: () => ({
        catch: () => mockDelete(),
      }),
    }),
  },
}));

describe('distributedRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mengizinkan request jika hit belum mencapai limit dan menyimpan timestamp', async () => {
    mockSelect.mockResolvedValue([]);
    mockInsert.mockResolvedValue([{ id: 'rl-1' }]);

    const result = await distributedRateLimit('test-key', 5, 60_000);
    expect(result.ok).toBe(true);
    expect(result.retryAfterMs).toBe(0);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('memblokir request dan menghitung retryAfterMs jika limit tercapai', async () => {
    const now = new Date(1_000_000);
    const oldestTimestamp = new Date(now.getTime() - 30_000); // 30s ago in a 60s window
    mockSelect.mockResolvedValue([
      { id: '1', timestamp: oldestTimestamp },
      { id: '2', timestamp: new Date(now.getTime() - 20_000) },
    ]);

    const result = await distributedRateLimit('test-key', 2, 60_000, now);
    expect(result.ok).toBe(false);
    expect(result.retryAfterMs).toBe(30_000);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('mengizinkan kembali setelah window bergeser', async () => {
    mockSelect.mockResolvedValue([{ id: '1', timestamp: new Date(Date.now() - 10_000) }]);
    mockInsert.mockResolvedValue([{ id: 'rl-2' }]);

    const result = await distributedRateLimit('test-key', 2, 60_000);
    expect(result.ok).toBe(true);
    expect(result.retryAfterMs).toBe(0);
  });
});
