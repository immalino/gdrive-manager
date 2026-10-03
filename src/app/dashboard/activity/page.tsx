import { ActivityTable } from '@/components/activity/activity-table';

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground">
          Pantau riwayat operasi file dan status koneksi Google Drive secara terpusat.
        </p>
      </div>

      <ActivityTable />
    </div>
  );
}
