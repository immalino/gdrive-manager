'use client';

import Link from 'next/link';
import { HardDrive, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBytes } from '@/lib/format';
import type { AccountStatus, StorageAccountItem } from '@/types';

const STATUS_LABEL: Record<AccountStatus, string> = {
  connected: 'Connected',
  reconnect_required: 'Reconnect Required',
  error: 'Error',
};

const STATUS_VARIANT: Record<AccountStatus, 'default' | 'outline' | 'destructive'> = {
  connected: 'default',
  reconnect_required: 'outline',
  error: 'destructive',
};

interface AccountListProps {
  accounts?: StorageAccountItem[];
  isLoading?: boolean;
}

export function AccountList({ accounts = [], isLoading }: AccountListProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Google Accounts</CardTitle>
          <CardDescription>Penggunaan storage per akun terhubung.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/accounts" />}>
          Kelola
        </Button>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-7 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-2 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <HardDrive className="mb-2 size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Belum ada akun Google terhubung</p>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
              Hubungkan akun Google Drive untuk memantau kapasitas.
            </p>
            <Button size="sm" render={<a href="/api/google/connect" />}>
              <Plus />
              Add Account
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => {
              const pct =
                account.totalBytes && account.totalBytes > 0
                  ? Math.min(100, Math.round((account.usedBytes / account.totalBytes) * 100))
                  : null;

              return (
                <div
                  key={account.id}
                  className="space-y-2 rounded-lg border border-border/60 bg-card/50 p-3 transition-colors hover:border-border"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar size="sm">
                        {account.picture && <AvatarImage src={account.picture} alt="" />}
                        <AvatarFallback>
                          {account.email.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-none">
                          {account.email}
                        </p>
                        {account.name && (
                          <p className="truncate text-xs text-muted-foreground mt-0.5">
                            {account.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANT[account.status]} className="shrink-0">
                      {STATUS_LABEL[account.status]}
                    </Badge>
                  </div>

                  <Progress value={pct ?? 0} className="w-full" />

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatBytes(account.usedBytes)} /{' '}
                      {account.totalBytes == null ? '—' : formatBytes(account.totalBytes)}
                    </span>
                    <span>
                      {pct !== null ? `${pct}%` : 'Tanpa batas'}
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
