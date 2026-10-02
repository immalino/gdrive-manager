import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan storage semua akun Google Drive.
          </p>
        </div>
        <Button disabled>
          <Plus />
          Add Account
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Storage Overview</CardTitle>
          <CardDescription>
            Storage overview akan muncul setelah akun Google terhubung.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Belum ada data storage.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
