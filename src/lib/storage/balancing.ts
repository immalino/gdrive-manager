import { formatBytes } from '@/lib/format';

export interface StorageAccountInput {
  id: string;
  email: string;
  usedBytes: number;
  totalBytes: number | null;
  isUploadEnabled?: boolean;
}

export interface SharedFileInput {
  id: string;
  name: string;
  sizeBytes: number | null;
  accountId: string;
  mimeType?: string | null;
  parentId?: string | null;
}

export interface AccountStorageMetric {
  id: string;
  email: string;
  usedBytes: number;
  totalBytes: number;
  freeBytes: number;
  usageRatio: number; // 0 to 1
  usagePercentage: number; // 0 to 100
  isUploadEnabled?: boolean;
}

export interface StorageImbalanceResult {
  score: number; // 0 to 100
  isImbalanced: boolean;
  averageUsageRatio: number;
  accounts: AccountStorageMetric[];
}

export interface BalancingRecommendation {
  fileId: string;
  fileName: string;
  sizeBytes: number;
  sourceAccountId: string;
  sourceAccountEmail: string;
  targetAccountId: string;
  targetAccountEmail: string;
  reason: string;
}

export interface BalancingEngineResult extends StorageImbalanceResult {
  recommendations: BalancingRecommendation[];
}

export const DEFAULT_QUOTA_BYTES = 15 * 1024 * 1024 * 1024; // 15 GB default

export function calculateStorageImbalance(accounts: StorageAccountInput[]): StorageImbalanceResult {
  if (accounts.length < 2) {
    const metrics: AccountStorageMetric[] = accounts.map((a) => {
      const total = a.totalBytes && a.totalBytes > 0 ? a.totalBytes : DEFAULT_QUOTA_BYTES;
      const usageRatio = Math.min(Math.max(a.usedBytes / total, 0), 1);
      return {
        id: a.id,
        email: a.email,
        usedBytes: a.usedBytes,
        totalBytes: total,
        freeBytes: Math.max(total - a.usedBytes, 0),
        usageRatio,
        usagePercentage: Math.round(usageRatio * 100),
        isUploadEnabled: a.isUploadEnabled !== false,
      };
    });

    return {
      score: 0,
      isImbalanced: false,
      averageUsageRatio: metrics[0]?.usageRatio ?? 0,
      accounts: metrics,
    };
  }

  const metrics: AccountStorageMetric[] = accounts.map((a) => {
    const total = a.totalBytes && a.totalBytes > 0 ? a.totalBytes : DEFAULT_QUOTA_BYTES;
    const usageRatio = Math.min(Math.max(a.usedBytes / total, 0), 1);
    return {
      id: a.id,
      email: a.email,
      usedBytes: a.usedBytes,
      totalBytes: total,
      freeBytes: Math.max(total - a.usedBytes, 0),
      usageRatio,
      usagePercentage: Math.round(usageRatio * 100),
      isUploadEnabled: a.isUploadEnabled !== false,
    };
  });

  const avgRatio = metrics.reduce((acc, curr) => acc + curr.usageRatio, 0) / metrics.length;

  const ratios = metrics.map((m) => m.usageRatio);
  const minRatio = Math.min(...ratios);
  const maxRatio = Math.max(...ratios);
  const rangeDiff = maxRatio - minRatio;

  // Imbalance score: 0 to 100 based on difference between highest and lowest usage
  const score = Math.round(rangeDiff * 100);
  const isImbalanced = score >= 25; // imbalance if delta is >= 25%

  return {
    score,
    isImbalanced,
    averageUsageRatio: avgRatio,
    accounts: metrics,
  };
}

export function getBalancingRecommendations(
  accounts: StorageAccountInput[],
  files: SharedFileInput[],
): BalancingRecommendation[] {
  const imbalance = calculateStorageImbalance(accounts);
  if (!imbalance.isImbalanced || accounts.length < 2) {
    return [];
  }

  // Clone account state to simulate changes
  const simulatedAccounts = imbalance.accounts.map((a) => ({ ...a }));

  // Filter regular files (bukan folder, ukuran > 0)
  const candidateFiles = files.filter(
    (f) => f.sizeBytes && f.sizeBytes > 0 && f.mimeType !== 'application/vnd.google-apps.folder',
  );

  const recommendations: BalancingRecommendation[] = [];
  const avg = imbalance.averageUsageRatio;

  // Loop evaluasi rekomendasi
  for (let step = 0; step < 10; step++) {
    const sources = simulatedAccounts
      .filter((a) => a.usageRatio > avg + 0.05)
      .sort((a, b) => b.usageRatio - a.usageRatio);

    const targets = simulatedAccounts
      .filter((a) => a.isUploadEnabled !== false && a.usageRatio < avg - 0.05)
      .sort((a, b) => a.usageRatio - b.usageRatio);

    if (sources.length === 0 || targets.length === 0) break;

    const source = sources[0]!;
    const target = targets[0]!;

    // Cari file milik source yang ukurannya muat di target dan optimal
    const sourceFiles = candidateFiles
      .filter((f) => f.accountId === source.id && !recommendations.some((r) => r.fileId === f.id))
      .sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0));

    if (sourceFiles.length === 0) {
      // Tidak ada file lagi dari source ini yang bisa dipindah
      break;
    }

    // Pilih file yang muat di target dengan safety margin minimal 10 MB
    const fileToMove = sourceFiles.find(
      (f) => target.freeBytes >= (f.sizeBytes ?? 0) + 10 * 1024 * 1024,
    );

    if (!fileToMove || !fileToMove.sizeBytes) {
      break;
    }

    // Buat rekomendasi
    recommendations.push({
      fileId: fileToMove.id,
      fileName: fileToMove.name,
      sizeBytes: fileToMove.sizeBytes,
      sourceAccountId: source.id,
      sourceAccountEmail: source.email,
      targetAccountId: target.id,
      targetAccountEmail: target.email,
      reason: `Pindahkan "${fileToMove.name}" (${formatBytes(fileToMove.sizeBytes)}) dari ${source.email} (${source.usagePercentage}%) ke ${target.email} (${target.usagePercentage}%) untuk menyeimbangkan kuota.`,
    });

    // Perbarui simulasi kuota
    source.usedBytes -= fileToMove.sizeBytes;
    source.freeBytes += fileToMove.sizeBytes;
    source.usageRatio = Math.min(Math.max(source.usedBytes / source.totalBytes, 0), 1);
    source.usagePercentage = Math.round(source.usageRatio * 100);

    target.usedBytes += fileToMove.sizeBytes;
    target.freeBytes -= fileToMove.sizeBytes;
    target.usageRatio = Math.min(Math.max(target.usedBytes / target.totalBytes, 0), 1);
    target.usagePercentage = Math.round(target.usageRatio * 100);
  }

  return recommendations;
}
