'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from 'cn';
import { MobileNav } from '@/components/layout/sidebar';
import { UserMenu } from '@/components/layout/user-menu';
import { Input } from '@/components/ui/input';

interface HeaderProps {
  user: { name: string; email: string };
}

function HeaderSearch({ defaultSearch }: { defaultSearch: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultSearch);
  const [focused, setFocused] = useState(false);

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
    <form
      onSubmit={onSubmit}
      className={cn(
        'relative w-full transition-all duration-200 ease-in-out',
        focused ? 'max-w-xl' : 'max-w-md',
      )}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search in Drive..."
        className="pl-9 h-9 w-full bg-muted/40 hover:bg-muted/60 focus:bg-background transition-colors border-muted focus:border-ring rounded-lg text-sm"
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
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-4 md:px-6 bg-background/95 backdrop-blur">
      <div className="flex items-center gap-3 shrink-0">
        <MobileNav />
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:opacity-85 transition-opacity"
        >
          <span aria-hidden="true" className="text-base">
            ☁
          </span>
          <span>GDrive Pool</span>
        </Link>
      </div>

      <div className="flex-1 flex justify-center max-w-xl mx-2">
        <Suspense
          fallback={
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                disabled
                placeholder="Search in Drive..."
                className="pl-9 h-9 w-full bg-muted/40 border-muted rounded-lg text-sm"
                aria-label="Search files"
              />
            </div>
          }
        >
          <HeaderSearchContainer />
        </Suspense>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <UserMenu user={user} />
      </div>
    </header>
  );
}
