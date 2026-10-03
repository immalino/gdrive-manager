import { describe, expect, it } from 'vitest';
import { runBatchPool } from '@/lib/utils/batch';

describe('runBatchPool', () => {
  it('menjalankan tugas dalam pool concurrency terkontrol', async () => {
    let running = 0;
    let maxRunning = 0;
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const results = await runBatchPool(items, 3, async (item) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 20));
      running--;
      return item * 2;
    });

    expect(maxRunning).toBe(3);
    expect(results.length).toBe(10);
    expect(results.every((r) => r.success)).toBe(true);
    expect(results[0]?.result).toBe(2);
  });

  it('tetap melanjutkan tugas lain bila salah satu item gagal', async () => {
    const items = ['ok1', 'fail', 'ok2'];
    const results = await runBatchPool(items, 2, async (item) => {
      if (item === 'fail') throw new Error('Item error');
      return item.toUpperCase();
    });

    expect(results.find((r) => r.item === 'fail')?.success).toBe(false);
    expect(results.find((r) => r.item === 'ok1')?.success).toBe(true);
    expect(results.find((r) => r.item === 'ok2')?.success).toBe(true);
  });

  it('menangani input array kosong dengan baik', async () => {
    const results = await runBatchPool([], 5, async (x: number) => x * 2);
    expect(results).toEqual([]);
  });

  it('mempertahankan urutan hasil sesuai urutan input meskipun waktu pengerjaan bervariasi', async () => {
    const items = [30, 10, 20, 5];
    const results = await runBatchPool(items, 4, async (delayMs) => {
      await new Promise((r) => setTimeout(r, delayMs));
      return `done-${delayMs}`;
    });

    expect(results.map((r) => r.result)).toEqual(['done-30', 'done-10', 'done-20', 'done-5']);
  });

  it('menangani concurrency yang lebih besar daripada jumlah item', async () => {
    const items = ['a', 'b'];
    const results = await runBatchPool(items, 10, async (item) => item.toUpperCase());

    expect(results.length).toBe(2);
    expect(results[0]?.result).toBe('A');
    expect(results[1]?.result).toBe('B');
  });

  it('menangani exception non-Error dengan aman', async () => {
    const items = [1];
    const results = await runBatchPool(items, 1, async () => {
      throw 'string error';
    });

    expect(results[0]?.success).toBe(false);
    expect(results[0]?.error).toBe('Unknown error');
  });
});
