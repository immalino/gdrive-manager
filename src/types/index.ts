export type AccountStatus = 'connected' | 'reconnect_required' | 'error';

export interface StorageQuota {
  totalBytes: number | null;
  usedBytes: number;
  freeBytes: number | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
