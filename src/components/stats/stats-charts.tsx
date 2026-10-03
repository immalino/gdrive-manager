'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};
import {
  Activity,
  Archive,
  Copy,
  Download,
  Edit,
  FileQuestion,
  Files,
  FileText,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  LineChart as LineChartIcon,
  Link2,
  Move,
  RefreshCw,
  Trash2,
  Unlink,
  Upload,
  Video,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatBytes, formatDateTime } from '@/lib/format';
import type { ActionCountItem, FileKindStat, SnapshotHistoryItem } from '@/types';

interface StatsChartsProps {
  fileKinds?: FileKindStat[];
  snapshotHistory?: SnapshotHistoryItem[];
  actionCounts?: ActionCountItem[];
  isLoading?: boolean;
}

const ALL_KINDS = ['document', 'image', 'video', 'archive', 'other', 'folder'] as const;

const KIND_METADATA: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  document: { label: 'Documents', icon: FileText, color: 'text-blue-500' },
  image: { label: 'Images', icon: ImageIcon, color: 'text-emerald-500' },
  video: { label: 'Videos', icon: Video, color: 'text-violet-500' },
  archive: { label: 'Archives', icon: Archive, color: 'text-amber-500' },
  other: { label: 'Others', icon: FileQuestion, color: 'text-rose-500' },
  folder: { label: 'Folders', icon: Folder, color: 'text-sky-500' },
};

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

function formatShortTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function StatsCharts({
  fileKinds = [],
  snapshotHistory = [],
  actionCounts = [],
  isLoading,
}: StatsChartsProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const kindItems = ALL_KINDS.map((kind) => {
    const meta = KIND_METADATA[kind] ?? {
      label: kind,
      icon: Files,
      color: 'text-muted-foreground',
    };
    const stat = fileKinds.find((k) => k.kind === kind);
    return {
      kind,
      label: meta.label,
      icon: meta.icon,
      color: meta.color,
      count: stat?.count ?? 0,
      totalSize: stat?.totalSize ?? 0,
      formattedSize: formatBytes(stat?.totalSize ?? 0),
    };
  });

  const historyData = snapshotHistory.map((s) => ({
    id: s.id,
    displayTime: formatShortTime(s.createdAt),
    fullTime: formatDateTime(s.createdAt),
    usedBytes: s.usedBytes,
    totalBytes: s.totalBytes,
    formattedUsed: formatBytes(s.usedBytes),
  }));

  const hasHistory = snapshotHistory.length >= 2;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Riwayat Pemakaian Storage */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Riwayat Pemakaian Storage</CardTitle>
                <CardDescription>
                  Tren penggunaan storage berdasarkan snapshot kuota.
                </CardDescription>
              </div>
              <LineChartIcon className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : !hasHistory ? (
              <div className="flex h-[260px] flex-col items-center justify-center text-center">
                <LineChartIcon className="mb-2 size-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">Data riwayat belum cukup</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Riwayat pemakaian akan muncul setelah minimal 2 snapshot tercatat.
                </p>
              </div>
            ) : isMounted ? (
              <div className="h-[260px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="displayTime"
                      tickLine={false}
                      fontSize={11}
                      stroke="currentColor"
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tickLine={false}
                      fontSize={11}
                      stroke="currentColor"
                      className="text-muted-foreground"
                      tickFormatter={(val) => formatBytes(Number(val))}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as (typeof historyData)[0];
                          return (
                            <div className="rounded-lg border bg-popover p-2 text-xs shadow-md">
                              <p className="font-medium text-popover-foreground">{data.fullTime}</p>
                              <p className="mt-1 text-primary">
                                Digunakan: {formatBytes(data.usedBytes)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="usedBytes"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#storageGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Distribusi File per Jenis */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Distribusi File per Jenis</CardTitle>
                <CardDescription>
                  Klasifikasi file berdasarkan tipe konten di Google Drive.
                </CardDescription>
              </div>
              <Files className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : isMounted ? (
              <div className="h-[260px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={kindItems} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      fontSize={11}
                      stroke="currentColor"
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tickLine={false}
                      fontSize={11}
                      stroke="currentColor"
                      className="text-muted-foreground"
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload as (typeof kindItems)[0];
                          return (
                            <div className="rounded-lg border bg-popover p-2 text-xs shadow-md">
                              <p className="font-medium text-popover-foreground">{item.label}</p>
                              <p className="mt-1 text-primary">Jumlah: {item.count} file</p>
                              <p className="text-muted-foreground">Ukuran: {item.formattedSize}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Rincian File per Jenis (Tabel PRD §7) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Rincian Jenis File</CardTitle>
            <CardDescription>
              Detail jumlah dan total ukuran untuk setiap kategori file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Jumlah File</TableHead>
                      <TableHead className="text-right">Total Ukuran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kindItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <TableRow key={item.kind}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Icon className={`size-4 ${item.color}`} />
                              <span>{item.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {item.count.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">
                            {item.formattedSize}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ringkasan Aksi (Action Counts) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Frekuensi Aktivitas</CardTitle>
            <CardDescription>
              Total operasi dan tindakan yang telah dilakukan akun Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : actionCounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Activity className="mb-2 size-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">Belum ada catatan aksi</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aksi seperti upload, move, dan rename akan terhitung di sini.
                </p>
              </div>
            ) : (
              <div className="divide-y rounded-md border">
                {actionCounts.map((ac) => {
                  const conf = ACTION_CONFIG[ac.action] ?? {
                    label: ac.action,
                    icon: Activity,
                    badgeClass: 'border-border bg-muted text-muted-foreground',
                  };
                  const Icon = conf.icon;

                  return (
                    <div key={ac.action} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2.5">
                        <Badge
                          variant="outline"
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium ${conf.badgeClass}`}
                        >
                          <Icon className="size-3 shrink-0" />
                          <span>{conf.label}</span>
                        </Badge>
                      </div>
                      <div className="font-mono text-sm font-semibold">
                        {ac.count.toLocaleString('id-ID')} kali
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
