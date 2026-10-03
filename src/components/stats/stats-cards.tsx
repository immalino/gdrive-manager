'use client';

import { Archive, CheckCircle2, Database, Files, HardDrive, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBytes } from '@/lib/format';
import type { FileKindStat, StatsTotals } from '@/types';

interface StatsCardsProps {
  totals?: StatsTotals;
  fileKinds?: FileKindStat[];
  isLoading?: boolean;
}

export function StatsCards({ totals, fileKinds = [], isLoading }: StatsCardsProps) {
  const totalFiles = fileKinds.reduce((acc, curr) => acc + curr.count, 0);
  const totalFileSize = fileKinds.reduce((acc, curr) => acc + curr.totalSize, 0);

  const usedPct =
    totals?.totalBytes && totals.totalBytes > 0
      ? Math.min(Math.round((totals.usedBytes / totals.totalBytes) * 100), 100)
      : null;

  const cards = [
    {
      title: 'Total Storage',
      value: totals?.totalBytes == null ? 'Tidak terbatas' : formatBytes(totals.totalBytes),
      desc: totals ? `Kapasitas total gabungan` : undefined,
      icon: HardDrive,
      color: 'text-primary',
    },
    {
      title: 'Used Storage',
      value: totals ? formatBytes(totals.usedBytes) : '—',
      desc: usedPct != null ? `${usedPct}% dari total storage` : undefined,
      progress: usedPct,
      icon: Database,
      color: 'text-blue-500',
    },
    {
      title: 'Free Storage',
      value: totals?.freeBytes == null ? '—' : formatBytes(totals.freeBytes),
      desc: totals ? 'Sisa ruang tersedia' : undefined,
      icon: CheckCircle2,
      color: 'text-emerald-500',
    },
    {
      title: 'Accounts',
      value: totals ? String(totals.accountCount) : '—',
      desc: 'Akun Google terhubung',
      icon: Users,
      color: 'text-amber-500',
    },
    {
      title: 'Total Files',
      value: totalFiles.toLocaleString('id-ID'),
      desc: 'File dan folder terindeks',
      icon: Files,
      color: 'text-indigo-500',
    },
    {
      title: 'Ukuran Terindeks',
      value: formatBytes(totalFileSize),
      desc: 'Total volume file di database',
      icon: Archive,
      color: 'text-violet-500',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <Icon className={`size-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-2xl font-bold tracking-tight">{c.value}</div>
                  {c.progress != null && (
                    <div className="pt-1">
                      <Progress value={c.progress} className="h-1.5" />
                    </div>
                  )}
                  {c.desc && <p className="text-xs text-muted-foreground">{c.desc}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
