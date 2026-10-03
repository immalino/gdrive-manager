'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AccountList } from '@/components/dashboard/account-list';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { RecentFiles } from '@/components/dashboard/recent-files';
import { StorageOverview } from '@/components/dashboard/storage-overview';
import { api, ApiError } from '@/lib/api-client';
import type { ActivityResponse, FilesResponse, StorageResponse } from '@/types';

function formatErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return `[${err.code}] ${err.message}`;
  if (err instanceof Error) return err.message;
  return 'Kesalahan tidak diketahui.';
}

export default function StoragePage() {
  const {
    data: storage,
    isPending: storagePending,
    isError: storageError,
    error: storageErr,
  } = useQuery({
    queryKey: ['storage'],
    queryFn: () => api.get<StorageResponse>('/api/storage'),
    refetchInterval: 5 * 60_000,
  });

  const {
    data: filesData,
    isPending: filesPending,
    isError: filesError,
    error: filesErr,
  } = useQuery({
    queryKey: ['files', { recent: true }],
    queryFn: () => api.get<FilesResponse>('/api/files?recent=1'),
  });

  const {
    data: activityData,
    isPending: activityPending,
    isError: activityError,
    error: activityErr,
  } = useQuery({
    queryKey: ['activity', { limit: 5 }],
    queryFn: () => api.get<ActivityResponse>('/api/activity?limit=5'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Storage</h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan kapasitas storage dan aktivitas seluruh akun Google Drive.
          </p>
        </div>
      </div>

      {storageError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Gagal memuat data storage</AlertTitle>
          <AlertDescription>{formatErrorMessage(storageErr)}</AlertDescription>
        </Alert>
      )}

      {filesError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Gagal memuat file terbaru</AlertTitle>
          <AlertDescription>{formatErrorMessage(filesErr)}</AlertDescription>
        </Alert>
      )}

      {activityError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Gagal memuat aktivitas terbaru</AlertTitle>
          <AlertDescription>{formatErrorMessage(activityErr)}</AlertDescription>
        </Alert>
      )}

      <StorageOverview totals={storage?.totals} isLoading={storagePending} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AccountList accounts={storage?.accounts} isLoading={storagePending} />
        <RecentFiles files={filesData?.files} isLoading={filesPending} />
      </div>

      <RecentActivity activity={activityData?.activity} isLoading={activityPending} />

      <QuickActions />
    </div>
  );
}
