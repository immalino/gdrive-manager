'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AddAccountButton } from '@/components/accounts/add-account-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, ApiError } from '@/lib/api-client';
import { formatBytes, formatDateTime } from '@/lib/format';
import type { AccountStatus, StorageAccountItem, StorageResponse } from '@/types';

const STATUS_LABEL: Record<AccountStatus, string> = {
  connected: 'Connected',
  reconnect_required: 'Reconnect Required',
  error: 'Error',
};

const STATUS_VARIANT: Record<AccountStatus, 'secondary' | 'outline' | 'destructive'> = {
  connected: 'secondary',
  reconnect_required: 'outline',
  error: 'destructive',
};

const CONNECT_ERROR: Record<string, string> = {
  invalid_state: 'Sesi OAuth tidak valid (kemungkinan CSRF). Silakan coba lagi.',
  exchange_failed: 'Gagal menukar kode OAuth dengan Google. Silakan coba lagi.',
  no_refresh_token: 'Google tidak mengirim refresh token. Silakan hubungkan ulang akun.',
  access_denied: 'Akses ditolak. Pastikan email Anda terdaftar sebagai test user Google.',
};

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="py-3">
      <CardContent className="px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

export function AccountsTable() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');
  const connectError = searchParams.get('error');
  const [pendingDisconnect, setPendingDisconnect] = useState<StorageAccountItem | null>(null);

  useEffect(() => {
    if (connected) toast.success('Akun Google berhasil terhubung.');
  }, [connected]);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['storage'],
    queryFn: () => api.get<StorageResponse>('/api/storage'),
    refetchInterval: 60_000,
  });

  const refreshMutation = useMutation({
    mutationFn: () => api.post<{ synced: number }>('/api/accounts/refresh'),
    onSuccess: ({ synced }) => {
      queryClient.invalidateQueries({ queryKey: ['storage'] });
      toast.success(`Quota disinkronkan untuk ${synced} akun.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: boolean }>(`/api/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage'] });
      toast.success('Akun Google diputuskan.');
      setPendingDisconnect(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          disabled={refreshMutation.isPending}
          onClick={() => refreshMutation.mutate()}
        >
          <RefreshCw className={refreshMutation.isPending ? 'animate-spin' : undefined} />
          Refresh
        </Button>
        <AddAccountButton />
      </div>

      {connectError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Gagal menghubungkan akun</AlertTitle>
          <AlertDescription>
            {CONNECT_ERROR[connectError] ?? `Terjadi kesalahan: ${connectError}.`}
          </AlertDescription>
        </Alert>
      )}

      {isPending ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Card>
            <CardContent className="px-0 pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="text-right">Free</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Diperbarui</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`acc-skeleton-${i}`}>
                      <TableCell>
                        <Skeleton className="h-5 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-5 w-12" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Gagal memuat data storage</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError
              ? `[${error.code}] ${error.message}`
              : error instanceof Error
                ? error.message
                : 'Kesalahan tidak diketahui.'}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Total" value={formatBytes(data.totals.totalBytes)} />
            <SummaryCard label="Used" value={formatBytes(data.totals.usedBytes)} />
            <SummaryCard label="Free" value={formatBytes(data.totals.freeBytes)} />
            <SummaryCard label="Accounts" value={String(data.totals.accountCount)} />
          </div>

          {data.accounts.length === 0 ? (
            <Card>
              <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Belum ada akun Google. Klik + Add Account.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="px-0 pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Used</TableHead>
                      <TableHead className="text-right">Free</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Diperbarui</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar size="sm">
                              {account.picture && <AvatarImage src={account.picture} alt="" />}
                              <AvatarFallback>
                                {account.email.slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">{account.email}</span>
                              {account.snapshotAt && (
                                <span className="text-xs text-muted-foreground">
                                  Sync {formatDateTime(account.snapshotAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBytes(account.usedBytes)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBytes(account.freeBytes)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={STATUS_VARIANT[account.status]}
                            className={
                              account.status === 'reconnect_required'
                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-500 dark:border-amber-400/40 dark:text-amber-400'
                                : undefined
                            }
                          >
                            {STATUS_LABEL[account.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {account.updatedAt ? formatDateTime(account.updatedAt) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1.5">
                            {account.status !== 'connected' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 border-amber-500/40 text-xs text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 dark:border-amber-400/40 dark:text-amber-400"
                                render={
                                  <a
                                    href="/api/google/connect"
                                    aria-label={`Hubungkan ulang ${account.email}`}
                                  />
                                }
                              >
                                Reconnect
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              render={
                                <a
                                  href="https://drive.google.com/drive/my-drive"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Buka Drive ${account.email}`}
                                />
                              }
                            >
                              <ExternalLink />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Putuskan ${account.email}`}
                              onClick={() => setPendingDisconnect(account)}
                            >
                              <Trash2 className="text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <AlertDialog
        open={pendingDisconnect !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDisconnect(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Putuskan akun ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDisconnect?.email} akan dihapus dari aplikasi beserta snapshot quotanya. Token
              Google dicabut. Anda bisa menghubungkan ulang kapan saja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={disconnectMutation.isPending}
              onClick={() => {
                if (pendingDisconnect) disconnectMutation.mutate(pendingDisconnect.id);
              }}
            >
              {disconnectMutation.isPending ? 'Memutuskan...' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
