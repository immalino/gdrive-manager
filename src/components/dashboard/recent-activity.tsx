'use client';

import {
  Activity,
  Copy,
  Download,
  Edit,
  FolderPlus,
  Link2,
  Move,
  RefreshCw,
  Trash2,
  Unlink,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import type { ActivityItem } from '@/types';

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: typeof Upload; color: string }
> = {
  'file.upload': { label: 'Upload file', icon: Upload, color: 'text-emerald-500' },
  'file.download': { label: 'Download file', icon: Download, color: 'text-blue-500' },
  'file.delete': { label: 'Hapus file', icon: Trash2, color: 'text-rose-500' },
  'folder.create': { label: 'Buat folder', icon: FolderPlus, color: 'text-amber-500' },
  'account.connect': { label: 'Hubungkan akun', icon: Link2, color: 'text-primary' },
  'account.disconnect': { label: 'Putuskan akun', icon: Unlink, color: 'text-orange-500' },
  'file.rename': { label: 'Ubah nama file', icon: Edit, color: 'text-sky-500' },
  'file.move': { label: 'Pindah file', icon: Move, color: 'text-indigo-500' },
  'file.copy': { label: 'Salin file', icon: Copy, color: 'text-violet-500' },
  'quota.sync': { label: 'Sinkronisasi quota', icon: RefreshCw, color: 'text-muted-foreground' },
};

function formatActionDetail(item: ActivityItem): string | null {
  if (!item.metadata) return null;
  const meta = item.metadata;
  if (typeof meta.filename === 'string') return meta.filename;
  if (typeof meta.name === 'string') return meta.name;
  if (typeof meta.email === 'string') return meta.email;
  return null;
}

interface RecentActivityProps {
  activity?: ActivityItem[];
  isLoading?: boolean;
}

export function RecentActivity({ activity = [], isLoading }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
        <CardDescription>Catatan 5 aktivitas terbaru dari seluruh akun.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Skeleton className="size-4 shrink-0 rounded" />
                  <div className="space-y-1 min-w-0 flex-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="mb-2 size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Belum ada aktivitas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aktivitas seperti upload, download, dan hapus file akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {activity.map((item) => {
              const conf = ACTION_CONFIG[item.action] ?? {
                label: item.action,
                icon: Activity,
                color: 'text-muted-foreground',
              };
              const Icon = conf.icon;
              const detail = formatActionDetail(item);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2.5 transition-colors first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3 flex-1">
                    <Icon className={`size-4 shrink-0 ${conf.color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-none">
                        {conf.label}
                        {detail && (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            ({detail})
                          </span>
                        )}
                      </p>
                      {item.email && (
                        <p className="truncate text-xs text-muted-foreground mt-1">
                          {item.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
