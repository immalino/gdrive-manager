'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FILE_KINDS, type FileKind } from '@/lib/files/mime';
import type { SortKey } from '@/lib/files/merge';
import type { StorageAccountItem } from '@/types';

const ALL_ACCOUNTS = 'All Accounts';
const ALL_TYPES = 'All Types';

const KIND_ITEMS: Record<string, string> = {
  all: ALL_TYPES,
  document: 'Documents',
  image: 'Images',
  video: 'Videos',
  archive: 'Archives',
  other: 'Others',
  folder: 'Folders',
};

const SELECTABLE_KINDS: FileKind[] = [...FILE_KINDS, 'folder'];

const SORT_ITEMS: Record<SortKey, string> = {
  modified: 'Updated',
  name: 'Name',
  size: 'Size',
};

const DIR_ITEMS: Record<string, string> = {
  desc: 'Descending',
  asc: 'Ascending',
};

export interface FilesFiltersProps {
  searchInput: string;
  onSearchChange: (value: string) => void;
  accountId: string;
  onAccountChange: (value: string) => void;
  kind: string;
  onKindChange: (value: string) => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  dir: 'asc' | 'desc';
  onDirChange: (value: 'asc' | 'desc') => void;
  accounts: StorageAccountItem[];
}

export function FilesFilters({
  searchInput,
  onSearchChange,
  accountId,
  onAccountChange,
  kind,
  onKindChange,
  sort,
  onSortChange,
  dir,
  onDirChange,
  accounts,
}: FilesFiltersProps) {
  const accountItems = Object.fromEntries(accounts.map((a) => [a.id, a.email]));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search files..."
          className="pl-8"
          aria-label="Search files"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={accountId}
          onValueChange={(value) => onAccountChange(String(value))}
          items={{ all: ALL_ACCOUNTS, ...accountItems }}
        >
          <SelectTrigger className="w-48" aria-label="Filter akun">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">{ALL_ACCOUNTS}</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={kind}
          onValueChange={(value) => onKindChange(String(value))}
          items={KIND_ITEMS}
        >
          <SelectTrigger className="w-36" aria-label="Filter jenis file">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">{ALL_TYPES}</SelectItem>
            {SELECTABLE_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_ITEMS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sort}
          onValueChange={(value) => onSortChange(value as SortKey)}
          items={SORT_ITEMS}
        >
          <SelectTrigger className="w-32" aria-label="Urutkan berdasarkan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {(Object.keys(SORT_ITEMS) as SortKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SORT_ITEMS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={dir}
          onValueChange={(value) => onDirChange(value as 'asc' | 'desc')}
          items={DIR_ITEMS}
        >
          <SelectTrigger className="w-36" aria-label="Arah urutan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="desc">{DIR_ITEMS.desc}</SelectItem>
            <SelectItem value="asc">{DIR_ITEMS.asc}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
