'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit,
  ExternalLink,
  FolderPlus,
  Link2,
  Move,
  RefreshCw,
  Trash2,
  Unlink,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import type { ActivityItem, ActivityResponse, StorageResponse } from '@/types';

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Upload; badgeClass: string }> = {
  'file.upload': {
    label: 'Upload file',
    icon: Upload,
    badgeClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
  },
  'file.download': {
    label: 'Download file',
    icon: Download,
    badgeClass: 'border-blue-500/20 bg-blue-500/10 text-blue-500',
  },
  'file.delete': {
    label: 'Hapus file',
    icon: Trash2,
    badgeClass: 'border-rose-500/20 bg-rose-500/10 text-rose-500',
  },
  'file.rename': {
    label: 'Ubah nama file',
    icon: Edit,
    badgeClass: 'border-sky-500/20 bg-sky-500/10 text-sky-500',
  },
  'file.move': {
    label: 'Pindah file',
    icon: Move,
    badgeClass: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-500',
  },
  'file.copy': {
    label: 'Salin file',
    icon: Copy,
    badgeClass: 'border-violet-500/20 bg-violet-500/10 text-violet-500',
  },
  'folder.create': {
    label: 'Buat folder',
    icon: FolderPlus,
    badgeClass: 'border-amber-500/20 bg-amber-500/10 text-amber-500',
  },
  'account.connect': {
    label: 'Hubungkan akun',
    icon: Link2,
    badgeClass: 'border-primary/20 bg-primary/10 text-primary',
  },
  'account.disconnect': {
    label: 'Putuskan akun',
    icon: Unlink,
    badgeClass: 'border-orange-500/20 bg-orange-500/10 text-orange-500',
  },
  'quota.sync': {
    label: 'Sinkronisasi quota',
    icon: RefreshCw,
    badgeClass: 'border-border bg-muted text-muted-foreground',
  },
};

const ACTION_SELECT_ITEMS: Record<string, string> = {
  all: 'Semua Aksi',
  'file.upload': 'Upload file',
  'file.download': 'Download file',
  'file.delete': 'Hapus file',
  'file.rename': 'Ubah nama file',
  'file.move': 'Pindah file',
  'file.copy': 'Salin file',
  'folder.create': 'Buat folder',
  'account.connect': 'Hubungkan akun',
  'account.disconnect': 'Putuskan akun',
  'quota.sync': 'Sinkronisasi quota',
};

const PAGE_SIZE = 20;

function formatDetail(item: ActivityItem): string {
  if (!item.metadata) return item.fileId ? `ID: ${item.fileId}` : '—';
  const meta = item.metadata;
  if (meta.oldName && meta.newName) {
    return `${meta.oldName} → ${meta.newName}`;
  }
  if (meta.sourceName && meta.newName) {
    return `${meta.sourceName} → ${meta.newName}`;
  }
  if (typeof meta.filename === 'string') return meta.filename;
  if (typeof meta.name === 'string') return meta.name;
  if (typeof meta.email === 'string') return meta.email;
  if (item.fileId) return `ID: ${item.fileId}`;
  return '—';
}

export function ActivityTable() {
  const [action, setAction] = useState<string>('all');
  const [accountId, setAccountId] = useState<string>('all');
  const [page, setPage] = useState<number>(1);

  const { data: storageData } = useQuery({
    queryKey: ['storage'],
    queryFn: () => api.get<StorageResponse>('/api/storage'),
  });

  const accounts = storageData?.accounts ?? [];
  const accountItems = Object.fromEntries(accounts.map((a) => [a.id, a.email]));

  const queryParams = new URLSearchParams();
  if (action !== 'all') queryParams.set('action', action);
  if (accountId !== 'all') queryParams.set('accountId', accountId);
  queryParams.set('page', String(page));
  queryParams.set('pageSize', String(PAGE_SIZE));

  const {
    data: activityData,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['activity', { action, accountId, page, pageSize: PAGE_SIZE }],
    queryFn: () => api.get<ActivityResponse>(`/api/activity?${queryParams.toString()}`),
  });

  const items = activityData?.activity ?? [];

  const handleActionChange = (value: string | null) => {
    setAction(value ?? 'all');
    setPage(1);
  };

  const handleAccountChange = (value: string | null) => {
    setAccountId(value ?? 'all');
    setPage(1);
  };

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Riwayat Aktivitas</CardTitle>
          <CardDescription>
            Catatan tindakan dan perubahan file di seluruh akun Google Drive.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={action} onValueChange={handleActionChange} items={ACTION_SELECT_ITEMS}>
            <SelectTrigger className="w-44" aria-label="Filter jenis aksi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {Object.entries(ACTION_SELECT_ITEMS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={accountId}
            onValueChange={handleAccountChange}
            items={{ all: 'Semua Akun', ...accountItems }}
          >
            <SelectTrigger className="w-48" aria-label="Filter akun Google">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">Semua Akun</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="py-8 text-center text-sm text-destructive">
            Gagal memuat log aktivitas:{' '}
            {error instanceof Error ? error.message : 'Kesalahan server'}
          </div>
        ) : isPending ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="mb-2 size-10 text-muted-foreground/50" />
            <p className="text-sm font-medium">Belum ada aktivitas.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aktivitas seperti upload, rename, download, atau hapus file akan tercatat di sini.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">Waktu</TableHead>
                    <TableHead className="w-40">Aksi</TableHead>
                    <TableHead className="w-52">Akun</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="w-28 text-right">File</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const conf = ACTION_CONFIG[item.action] ?? {
                      label: item.action,
                      icon: Activity,
                      badgeClass: 'border-border bg-muted text-muted-foreground',
                    };
                    const Icon = conf.icon;
                    const detail = formatDetail(item);

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(item.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium ${conf.badgeClass}`}
                          >
                            <Icon className="size-3 shrink-0" />
                            <span>{conf.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                          {item.email ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs font-medium truncate max-w-[280px]">
                          {detail}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.fileId ? (
                            <a
                              href={`https://drive.google.com/open?id=${item.fileId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              Buka
                              <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-muted-foreground">Halaman {page}</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1 || isPending}
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={items.length < PAGE_SIZE || isPending}
                >
                  Selanjutnya
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
