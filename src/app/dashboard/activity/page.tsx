import { Card, CardContent } from '@/components/ui/card';

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">Riwayat aktivitas lintas akun.</p>
      </div>
      <Card>
        <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Log aktivitas belum tersedia.
        </CardContent>
      </Card>
    </div>
  );
}
