'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AccountList } from '@/components/dashboard/account-list';
import { StorageOverview } from '@/components/dashboard/storage-overview';
import { StatsCharts } from '@/components/stats/stats-charts';
import { api, ApiError } from '@/lib/api-client';
import type { StatsResponse, StorageResponse } from '@/types';

function formatErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return `[${err.code}] ${err.message}`;
  if (err instanceof Error) return err.message;
  return 'Kesalahan tidak diketahui.';
}

export default function StoragePage() {
  const queryClient = useQueryClient();

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
    data: stats,
    isPending: statsPending,
    isError: statsError,
    error: statsErr,
  } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<StatsResponse>('/api/stats'),
  });

  const refreshMutation = useMutation({
    mutationFn: () => api.post<{ synced: number }>('/api/accounts/refresh'),
    onSuccess: ({ synced }) => {
      queryClient.invalidateQueries({ queryKey: ['storage'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success(`Quota disinkronkan untuk ${synced} akun.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Storage</h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan kapasitas total pool, rincian per-akun, dan tren penggunaan storage.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={refreshMutation.isPending}
          onClick={() => refreshMutation.mutate()}
        >
          <RefreshCw
            className={`mr-2 size-3.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`}
          />
          Perbarui
        </Button>
      </div>

      {storageError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Gagal memuat data storage</AlertTitle>
          <AlertDescription>{formatErrorMessage(storageErr)}</AlertDescription>
        </Alert>
      )}

      {statsError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Gagal memuat statistik</AlertTitle>
          <AlertDescription>{formatErrorMessage(statsErr)}</AlertDescription>
        </Alert>
      )}

      {/* Storage pool summary overview */}
      <StorageOverview totals={storage?.totals} isLoading={storagePending} />

      {/* Per-account storage breakdown cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Accounts Breakdown</h2>
        <AccountList accounts={storage?.accounts} isLoading={storagePending} />
      </div>

      {/* Visual storage analytics charts */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-semibold tracking-tight">Analytics & Trends</h2>
        <StatsCharts
          fileKinds={stats?.fileKinds}
          snapshotHistory={stats?.snapshotHistory}
          actionCounts={stats?.actionCounts}
          isLoading={statsPending}
        />
      </div>
    </div>
  );
}
