'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { MobileNav } from '@/components/layout/sidebar';
import { UserMenu } from '@/components/layout/user-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadButton } from '@/components/upload/upload-dialog';
import { api } from '@/lib/api-client';

interface HeaderProps {
  user: { name: string; email: string };
}

function HeaderSearch({ defaultSearch }: { defaultSearch: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultSearch);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = value.trim();
    if (query) {
      router.push(`/dashboard?search=${encodeURIComponent(query)}`);
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <form onSubmit={onSubmit} className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search files..."
        className="pl-8"
        aria-label="Search files"
      />
    </form>
  );
}

function HeaderSearchContainer() {
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get('search') ?? '';
  return <HeaderSearch key={currentSearch} defaultSearch={currentSearch} />;
}

export function Header({ user }: HeaderProps) {
  const queryClient = useQueryClient();
  const refreshMutation = useMutation({
    mutationFn: () => api.post<{ synced: number }>('/api/accounts/refresh'),
    onSuccess: ({ synced }) => {
      queryClient.invalidateQueries({ queryKey: ['storage'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      toast.success(`Quota disinkronkan untuk ${synced} akun.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
      <MobileNav />
      <Suspense
        fallback={
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              disabled
              placeholder="Search files..."
              className="pl-8"
              aria-label="Search files"
            />
          </div>
        }
      >
        <HeaderSearchContainer />
      </Suspense>
      <div className="ml-auto flex items-center gap-2">
        <UploadButton />
        <Button
          variant="outline"
          disabled={refreshMutation.isPending}
          onClick={() => refreshMutation.mutate()}
          aria-label="Refresh quota Google Accounts"
        >
          <RefreshCw className={refreshMutation.isPending ? 'animate-spin' : undefined} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
        <Button render={<a href="/api/google/connect" />}>
          <Plus />
          <span className="hidden sm:inline">Add Account</span>
        </Button>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
