import type { FileKindStat, StatsTotals } from '@/types';

export function calculateTotals(
  snapshots: Array<{ totalBytes: number | null; usedBytes: number } | null>,
  accountCount: number,
): StatsTotals {
  if (accountCount === 0 || snapshots.length === 0) {
    return {
      totalBytes: 0,
      usedBytes: 0,
      freeBytes: 0,
      accountCount: 0,
    };
  }

  const anyUnknownLimit = snapshots.some((s) => s == null || s.totalBytes == null);
  const totalBytes = snapshots.reduce((sum, s) => sum + (s?.totalBytes ?? 0), 0);
  const usedBytes = snapshots.reduce((sum, s) => sum + (s?.usedBytes ?? 0), 0);

  return {
    totalBytes: anyUnknownLimit ? null : totalBytes,
    usedBytes,
    freeBytes: anyUnknownLimit ? null : Math.max(totalBytes - usedBytes, 0),
    accountCount,
  };
}

export function aggregateFileKinds(fileKinds: FileKindStat[]): {
  totalFiles: number;
  totalSize: number;
} {
  return {
    totalFiles: fileKinds.reduce((acc, curr) => acc + curr.count, 0),
    totalSize: fileKinds.reduce((acc, curr) => acc + curr.totalSize, 0),
  };
}
