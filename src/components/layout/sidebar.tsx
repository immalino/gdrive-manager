'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Clock, Cloud, FolderOpen, Menu, Settings, Users } from 'lucide-react';
import { cn } from 'cn';
import { buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { api } from '@/lib/api-client';
import { formatBytes } from '@/lib/format';
import type { StorageResponse } from '@/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'My Drive', icon: FolderOpen },
  { href: '/dashboard/recent', label: 'Recent', icon: Clock },
  { href: '/dashboard/accounts', label: 'Accounts', icon: Users },
  { href: '/dashboard/storage', label: 'Storage', icon: Cloud },
  { href: '/dashboard/activity', label: 'Activity', icon: Activity },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/dashboard/files';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-xs'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarStorageBar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data } = useQuery({
    queryKey: ['storage'],
    queryFn: () => api.get<StorageResponse>('/api/storage'),
    refetchInterval: 5 * 60_000,
  });

  const totals = data?.totals;
  const used = totals?.usedBytes ?? 0;
  const total = totals?.totalBytes ?? 0;
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const active = pathname === '/dashboard/storage' || pathname.startsWith('/dashboard/storage/');

  return (
    <div className="border-t border-border p-3 shrink-0">
      <Link
        href="/dashboard/storage"
        onClick={onNavigate}
        className={cn(
          'block rounded-lg p-2.5 transition-colors',
          active
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground',
        )}
      >
        <div className="flex items-center gap-2 text-xs font-semibold mb-1.5">
          <Cloud className="size-4 shrink-0 text-muted-foreground" />
          <span>Storage</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden my-2">
          <div
            className="bg-primary h-full rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatBytes(used)} of {formatBytes(total)} used
          </span>
          <span className="font-medium text-[11px]">{percent}%</span>
        </div>
      </Link>
    </div>
  );
}

function Brand() {
  return (
    <Link
      href="/dashboard"
      className="flex h-14 items-center gap-2 border-b border-border px-4 text-sm font-semibold tracking-tight hover:opacity-85 transition-opacity"
    >
      <span aria-hidden="true" className="text-base">
        ☁
      </span>
      <span>GDrive Pool</span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:flex h-full justify-between">
      <div className="flex flex-col flex-1 min-h-0">
        <Brand />
        <div className="flex-1 overflow-y-auto p-3">
          <NavList />
        </div>
      </div>
      <SidebarStorageBar />
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'md:hidden')}
        aria-label="Buka menu navigasi"
      >
        <Menu className="size-4" />
      </SheetTrigger>
      <SheetContent side="left" className="w-60 gap-0 p-0 flex flex-col justify-between">
        <div className="flex flex-col flex-1 min-h-0">
          <SheetTitle className="sr-only">Navigasi</SheetTitle>
          <Brand />
          <div className="flex-1 overflow-y-auto p-3">
            <NavList onNavigate={() => setOpen(false)} />
          </div>
        </div>
        <SidebarStorageBar onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
