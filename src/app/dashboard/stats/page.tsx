'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StatsCards } from '@/components/stats/stats-cards';
import { StatsCharts } from '@/components/stats/stats-charts';
import { api, ApiError } from '@/lib/api-client';
import type { StatsResponse } from '@/types';

function formatErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return `[${err.code}] ${err.message}`;
  if (err instanceof Error) return err.message;
  return 'Kesalahan tidak diketahui.';
}

export default function StatsPage() {
  const { data, isPending, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<StatsResponse>('/api/stats'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Statistik & Analisis</h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan pemakaian storage, rincian file terindeks, dan tren aktivitas akun Google
            Drive.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isPending || isRefetching}
        >
          <RefreshCw className={`mr-2 size-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          Perbarui
        </Button>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Gagal memuat statistik</AlertTitle>
          <AlertDescription>{formatErrorMessage(error)}</AlertDescription>
        </Alert>
      )}

      <StatsCards totals={data?.totals} fileKinds={data?.fileKinds} isLoading={isPending} />

      <StatsCharts
        fileKinds={data?.fileKinds}
        snapshotHistory={data?.snapshotHistory}
        actionCounts={data?.actionCounts}
        isLoading={isPending}
      />
    </div>
  );
}
