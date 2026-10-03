import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBytes } from '@/lib/format';

interface StorageOverviewProps {
  totals?: {
    totalBytes: number | null;
    usedBytes: number;
    freeBytes: number | null;
    accountCount: number;
  };
  isLoading?: boolean;
}

export function StorageOverview({ totals, isLoading }: StorageOverviewProps) {
  const cards = [
    {
      label: 'Total Storage',
      value:
        totals?.totalBytes == null ? 'Tidak terbatas' : formatBytes(totals.totalBytes),
    },
    {
      label: 'Used',
      value: totals ? formatBytes(totals.usedBytes) : '—',
    },
    {
      label: 'Free',
      value: totals?.freeBytes == null ? '—' : formatBytes(totals.freeBytes),
    },
    {
      label: 'Accounts',
      value: totals ? String(totals.accountCount) : '—',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {c.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {isLoading ? <Skeleton className="h-8 w-28" /> : c.value}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
