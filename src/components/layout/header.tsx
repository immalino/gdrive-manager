'use client';

import { Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobileNav } from '@/components/layout/sidebar';

export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
      <MobileNav />
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input disabled placeholder="Search files..." className="pl-8" aria-label="Search files" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" disabled title="Fitur menyusul">
          <RefreshCw />
          Refresh
        </Button>
        <Button disabled title="Fitur menyusul">
          <Plus />
          Add Account
        </Button>
        <div data-slot="user-menu-slot" />
      </div>
    </header>
  );
}
