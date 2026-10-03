import { describe, expect, it } from 'vitest';
import { aggregateFileKinds, calculateTotals } from '@/lib/stats';
import type { FileKindStat } from '@/types';

describe('calculateTotals', () => {
  it('handles 0 accounts gracefully', () => {
    const res = calculateTotals([], 0);
    expect(res).toEqual({
      totalBytes: 0,
      usedBytes: 0,
      freeBytes: 0,
      accountCount: 0,
    });
  });

  it('calculates totals accurately with multiple snapshots', () => {
    const snapshots = [
      { totalBytes: 15 * 1024 ** 3, usedBytes: 5 * 1024 ** 3 },
      { totalBytes: 15 * 1024 ** 3, usedBytes: 10 * 1024 ** 3 },
    ];
    const res = calculateTotals(snapshots, 2);
    expect(res.accountCount).toBe(2);
    expect(res.totalBytes).toBe(30 * 1024 ** 3);
    expect(res.usedBytes).toBe(15 * 1024 ** 3);
    expect(res.freeBytes).toBe(15 * 1024 ** 3);
  });

  it('handles unknown/unlimited total storage', () => {
    const snapshots = [
      { totalBytes: null, usedBytes: 5 * 1024 ** 3 },
      { totalBytes: 15 * 1024 ** 3, usedBytes: 2 * 1024 ** 3 },
    ];
    const res = calculateTotals(snapshots, 2);
    expect(res.totalBytes).toBeNull();
    expect(res.freeBytes).toBeNull();
    expect(res.usedBytes).toBe(7 * 1024 ** 3);
  });

  it('prevents negative free space if used exceeds total', () => {
    const snapshots = [{ totalBytes: 1000, usedBytes: 1500 }];
    const res = calculateTotals(snapshots, 1);
    expect(res.freeBytes).toBe(0);
  });
});

describe('aggregateFileKinds', () => {
  it('correctly sums counts and file sizes', () => {
    const kinds: FileKindStat[] = [
      { kind: 'image', count: 10, totalSize: 5000 },
      { kind: 'video', count: 2, totalSize: 20000 },
      { kind: 'document', count: 5, totalSize: 1500 },
    ];
    const res = aggregateFileKinds(kinds);
    expect(res.totalFiles).toBe(17);
    expect(res.totalSize).toBe(26500);
  });

  it('handles empty kinds array', () => {
    const res = aggregateFileKinds([]);
    expect(res.totalFiles).toBe(0);
    expect(res.totalSize).toBe(0);
  });
});
