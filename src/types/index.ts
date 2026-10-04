import type { DriveFileDto } from '@/lib/google-drive/types';

export type AccountStatus = 'connected' | 'reconnect_required' | 'error';

export interface StorageQuota {
  totalBytes: number | null;
  usedBytes: number;
  freeBytes: number | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface StorageAccountItem {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  status: AccountStatus;
  role?: 'primary' | 'pool';
  isUploadEnabled: boolean;
  totalBytes: number | null;
  usedBytes: number;
  freeBytes: number | null;
  snapshotAt: string | null;
  updatedAt: string | null;
}

export interface StorageResponse {
  totals: {
    totalBytes: number | null;
    usedBytes: number;
    freeBytes: number | null;
    accountCount: number;
  };
  accounts: StorageAccountItem[];
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface FilesResponse {
  files: DriveFileDto[];
  failedAccounts: string[];
  currentFolder?: BreadcrumbItem | null;
  breadcrumb?: BreadcrumbItem[];
}

export interface BreadcrumbResponse {
  breadcrumb: BreadcrumbItem[];
  currentFolder?: BreadcrumbItem | null;
}

export interface ActivityItem {
  id: string;
  action: string;
  fileId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  email: string | null;
}

export interface ActivityResponse {
  activity: ActivityItem[];
  page?: number;
  pageSize?: number;
}

export interface StatsTotals {
  totalBytes: number | null;
  usedBytes: number;
  freeBytes: number | null;
  accountCount: number;
}

export interface FileKindStat {
  kind: string;
  count: number;
  totalSize: number;
}

export interface SnapshotHistoryItem {
  id: string;
  googleAccountId: string;
  totalBytes: number | null;
  usedBytes: number;
  freeBytes: number | null;
  createdAt: string;
}

export interface ActionCountItem {
  action: string;
  count: number;
}

export interface StatsResponse {
  totals: StatsTotals;
  fileKinds: FileKindStat[];
  snapshotHistory: SnapshotHistoryItem[];
  actionCounts: ActionCountItem[];
}

export interface FolderItem {
  id: string;
  name: string;
  accountId: string;
  accountEmail: string;
}

export interface FoldersResponse {
  folders: FolderItem[];
}

export interface BulkDeleteItem {
  id: string;
  accountId: string;
  name?: string;
}

export interface BulkDeleteResponse {
  deletedCount: number;
  failedCount: number;
  errors: Array<{ id: string; name?: string; error?: string }>;
}

export interface BulkMoveItem {
  id: string;
  accountId: string;
  fromFolderId?: string | null;
}

export interface BulkMoveResponse {
  movedCount: number;
  failedCount: number;
  errors: Array<{ id: string; error?: string }>;
}

export interface BalancingResponse {
  score: number;
  isImbalanced: boolean;
  averageUsageRatio: number;
  accounts: Array<{
    id: string;
    email: string;
    usedBytes: number;
    totalBytes: number;
    freeBytes: number;
    usageRatio: number;
    usagePercentage: number;
  }>;
  recommendations: Array<{
    fileId: string;
    fileName: string;
    sizeBytes: number;
    sourceAccountId: string;
    sourceAccountEmail: string;
    targetAccountId: string;
    targetAccountEmail: string;
    reason: string;
  }>;
}
