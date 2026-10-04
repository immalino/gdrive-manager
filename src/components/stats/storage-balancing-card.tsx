'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Scale,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api-client';
import { formatBytes } from '@/lib/format';
import type { BalancingResponse } from '@/types';

export function StorageBalancingCard() {
  const queryClient = useQueryClient();
  const [activeMigratingId, setActiveMigratingId] = useState<string | null>(null);

  const {
    data: balancing,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['storage-balancing'],
    queryFn: () => api.get<BalancingResponse>('/api/storage/balancing'),
  });

  const migrateMutation = useMutation({
    mutationFn: (rec: { fileId: string; targetAccountId: string; sourceAccountId: string }) =>
      api.post<{ success: boolean }>('/api/files/migrate', {
        fileId: rec.fileId,
        targetAccountId: rec.targetAccountId,
        sourceAccountId: rec.sourceAccountId,
      }),
    onMutate: (rec) => {
      setActiveMigratingId(rec.fileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-balancing'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('File berhasil dimigrasikan.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal memigrasikan file.');
    },
    onSettled: () => {
      setActiveMigratingId(null);
    },
  });

  const accountsCount = balancing?.accounts?.length ?? 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Scale className="size-4 text-primary" />
            <CardTitle className="text-base font-semibold">Storage Balancing</CardTitle>
            {balancing && (
              <Badge
                variant={
                  accountsCount < 2
                    ? 'secondary'
                    : balancing.isImbalanced
                      ? 'destructive'
                      : 'outline'
                }
                className={
                  !balancing.isImbalanced && accountsCount >= 2
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                    : ''
                }
              >
                {accountsCount < 2
                  ? 'Perlu 2+ Akun'
                  : balancing.isImbalanced
                    ? `Ketimpangan ${balancing.score}%`
                    : 'Seimbang'}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            Deteksi ketimpangan kapasitas storage dan rekomendasi migrasi file antar-akun pool.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          aria-label="Perbarui analisis balancing"
        >
          <RefreshCw className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {isLoading ? (
          <div className="flex h-28 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : accountsCount < 2 ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            Hubungkan minimal 2 akun Google Drive untuk mengaktifkan analisis pemerataan kapasitas
            storage.
          </div>
        ) : (
          <>
            {/* Score Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Indeks Ketimpangan Kuota</span>
                <span className="font-mono font-medium">{balancing?.score ?? 0} / 100</span>
              </div>
              <Progress
                value={balancing?.score ?? 0}
                className={`h-2 ${
                  balancing?.isImbalanced ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'
                }`}
              />
            </div>

            {/* Recommendations List */}
            {balancing?.recommendations && balancing.recommendations.length > 0 ? (
              <div className="space-y-2.5">
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Rekomendasi Migrasi ({balancing.recommendations.length})
                </h4>
                <div className="space-y-2">
                  {balancing.recommendations.map((rec) => {
                    const isBusy = activeMigratingId === rec.fileId;
                    return (
                      <div
                        key={rec.fileId}
                        className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                            <span className="truncate font-medium text-xs text-foreground">
                              {rec.fileName}
                            </span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              ({formatBytes(rec.sizeBytes)})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                            <span className="truncate max-w-[140px]">{rec.sourceAccountEmail}</span>
                            <ArrowRight className="size-3 shrink-0 text-muted-foreground/60" />
                            <span className="truncate max-w-[140px] text-foreground font-medium">
                              {rec.targetAccountEmail}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          className="shrink-0 text-xs h-7"
                          disabled={isBusy || migrateMutation.isPending}
                          onClick={() =>
                            migrateMutation.mutate({
                              fileId: rec.fileId,
                              targetAccountId: rec.targetAccountId,
                              sourceAccountId: rec.sourceAccountId,
                            })
                          }
                        >
                          {isBusy ? (
                            <>
                              <Loader2 className="mr-1.5 size-3 animate-spin" />
                              Memindahkan...
                            </>
                          ) : (
                            <>
                              <ArrowRightLeft className="mr-1.5 size-3" />
                              Migrasikan
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-500">
                <CheckCircle2 className="size-4 shrink-0" />
                <p>
                  Kapasitas penyimpanan terdistribusi secara seimbang antar akun. Belum ada file
                  yang perlu dimigrasi.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
