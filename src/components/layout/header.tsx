'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { MobileNav } from '@/components/layout/sidebar';
import { UserMenu } from '@/components/layout/user-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadButton } from '@/components/upload/upload-dialog';

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
      router.push(`/dashboard/files?search=${encodeURIComponent(query)}`);
    } else {
      router.push('/dashboard/files');
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
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
      <MobileNav />
      <Suspense
        fallback={
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input disabled placeholder="Search files..." className="pl-8" aria-label="Search files" />
          </div>
        }
      >
        <HeaderSearchContainer />
      </Suspense>
      <div className="ml-auto flex items-center gap-2">
        <UploadButton />
        <Button variant="outline" disabled title="Fitur menyusul">
          <RefreshCw />
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
