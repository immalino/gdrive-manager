import { Card, CardContent } from '@/components/ui/card';

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Accounts</h1>
        <p className="text-sm text-muted-foreground">Kelola akun Google Drive yang terhubung.</p>
      </div>
      <Card>
        <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Belum ada akun terhubung.
        </CardContent>
      </Card>
    </div>
  );
}
