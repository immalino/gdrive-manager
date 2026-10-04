'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { cn } from 'cn';

interface WorkerHealthResponse {
  status: 'active' | 'stale' | 'stopped';
  lastHeartbeat: string | null;
  elapsedSeconds: number | null;
  service: string;
}

export function WorkerStatusBadge() {
  const { data } = useQuery<WorkerHealthResponse>({
    queryKey: ['worker-health'],
    queryFn: () => api.get<WorkerHealthResponse>('/api/worker/health'),
    refetchInterval: 15_000,
  });

  const status = data?.status ?? 'stopped';
  const elapsed = data?.elapsedSeconds;

  let label = 'Worker Offline';
  let dotColor = 'bg-zinc-500';
  let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  let tooltip = 'Worker belum berjalan';

  if (status === 'active') {
    label = 'Worker Active';
    dotColor = 'bg-emerald-500 animate-pulse';
    badgeVariant = 'secondary';
    tooltip = `Worker aktif (heartbeat ${elapsed ?? 0}s lalu)`;
  } else if (status === 'stale') {
    label = 'Worker Stale';
    dotColor = 'bg-amber-500';
    badgeVariant = 'outline';
    tooltip = `Worker melambat (heartbeat ${elapsed ?? 0}s lalu)`;
  } else {
    label = 'Worker Stopped';
    dotColor = 'bg-destructive';
    badgeVariant = 'destructive';
    tooltip = elapsed !== null ? `Worker mati (terakhir aktif ${elapsed}s lalu)` : 'Worker mati';
  }

  return (
    <Badge
      variant={badgeVariant}
      title={tooltip}
      className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-normal border cursor-default select-none transition-colors"
    >
      <span className={cn('size-1.5 rounded-full', dotColor)} />
      <span className="text-[11px] font-medium">{label}</span>
    </Badge>
  );
}
