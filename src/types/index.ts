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

export interface FilesResponse {
  files: DriveFileDto[];
  failedAccounts: string[];
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
}
