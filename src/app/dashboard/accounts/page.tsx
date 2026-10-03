import { Suspense } from 'react';
import { AccountsTable } from '@/components/accounts/accounts-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Accounts</h1>
        <p className="text-sm text-muted-foreground">Kelola akun Google Drive yang terhubung.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-40" />}>
        <AccountsTable />
      </Suspense>
    </div>
  );
}
