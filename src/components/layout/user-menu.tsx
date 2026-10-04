'use client';

import { ChevronDown, LogOut, Settings, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth-client';

interface UserMenuProps {
  user: { name: string; email: string };
}

function initialsOf(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
  return (initials || email.charAt(0) || '?').toUpperCase();
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSignOut() {
    setLoading(true);
    try {
      await authClient.signOut();
    } finally {
      setLoading(false);
      router.push('/sign-in');
      router.refresh();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            disabled={loading}
            aria-label="Menu pengguna"
          >
            <Avatar size="sm">
              <AvatarFallback>{initialsOf(user.name, user.email)}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-32 truncate md:inline">{user.name}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/dashboard/accounts')}>
          <Users />
          Accounts
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onSignOut} disabled={loading}>
          <LogOut />
          {loading ? 'Memproses…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
