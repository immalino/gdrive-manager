'use client';

import { Filter, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  accountIds: string[];
  onAccountIdsChange: (ids: string[]) => void;
  kind: string;
  onKindChange: (value: string) => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  dir: 'asc' | 'desc';
  onDirChange: (value: 'asc' | 'desc') => void;
  sizeMin?: number;
  onSizeMinChange: (value?: number) => void;
  sizeMax?: number;
  onSizeMaxChange: (value?: number) => void;
  modifiedAfter?: string;
  onModifiedAfterChange: (value?: string) => void;
  modifiedBefore?: string;
  onModifiedBeforeChange: (value?: string) => void;
  onResetAdvanced: () => void;
  accounts: StorageAccountItem[];
}

export function FilesFilters({
  searchInput,
  onSearchChange,
  accountId,
  onAccountChange,
  accountIds,
  onAccountIdsChange,
  kind,
  onKindChange,
  sort,
  onSortChange,
  dir,
  onDirChange,
  sizeMin,
  onSizeMinChange,
  sizeMax,
  onSizeMaxChange,
  modifiedAfter,
  onModifiedAfterChange,
  modifiedBefore,
  onModifiedBeforeChange,
  onResetAdvanced,
  accounts,
}: FilesFiltersProps) {
  const [sizeUnit, setSizeUnit] = useState<'MB' | 'GB'>('MB');
  const mult = sizeUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;

  const [prevSizeMin, setPrevSizeMin] = useState(sizeMin);
  const [prevSizeMax, setPrevSizeMax] = useState(sizeMax);
  const [minSizeInput, setMinSizeInput] = useState(
    sizeMin != null ? (sizeMin / mult).toString() : '',
  );
  const [maxSizeInput, setMaxSizeInput] = useState(
    sizeMax != null ? (sizeMax / mult).toString() : '',
  );

  if (sizeMin !== prevSizeMin) {
    setPrevSizeMin(sizeMin);
    setMinSizeInput(sizeMin != null ? (sizeMin / mult).toString() : '');
  }
  if (sizeMax !== prevSizeMax) {
    setPrevSizeMax(sizeMax);
    setMaxSizeInput(sizeMax != null ? (sizeMax / mult).toString() : '');
  }

  const handleMinSizeChange = (valStr: string) => {
    setMinSizeInput(valStr);
    const num = parseFloat(valStr);
    const mult = sizeUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
    if (valStr.trim() === '' || isNaN(num) || num < 0) {
      onSizeMinChange(undefined);
    } else {
      onSizeMinChange(Math.round(num * mult));
    }
  };

  const handleMaxSizeChange = (valStr: string) => {
    setMaxSizeInput(valStr);
    const num = parseFloat(valStr);
    const mult = sizeUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
    if (valStr.trim() === '' || isNaN(num) || num < 0) {
      onSizeMaxChange(undefined);
    } else {
      onSizeMaxChange(Math.round(num * mult));
    }
  };

  const handleUnitChange = (newUnit: 'MB' | 'GB') => {
    setSizeUnit(newUnit);
    const mult = newUnit === 'GB' ? 1024 ** 3 : 1024 ** 2;
    const minNum = parseFloat(minSizeInput);
    if (minSizeInput.trim() !== '' && !isNaN(minNum) && minNum >= 0) {
      onSizeMinChange(Math.round(minNum * mult));
    }
    const maxNum = parseFloat(maxSizeInput);
    if (maxSizeInput.trim() !== '' && !isNaN(maxNum) && maxNum >= 0) {
      onSizeMaxChange(Math.round(maxNum * mult));
    }
  };

  const activeAdvancedCount = [
    accountIds.length > 0,
    sizeMin != null,
    sizeMax != null,
    Boolean(modifiedAfter),
    Boolean(modifiedBefore),
  ].filter(Boolean).length;

  const handleReset = () => {
    setMinSizeInput('');
    setMaxSizeInput('');
    onResetAdvanced();
  };

  const accountItems: Record<string, string> = {};
  if (accountIds.length > 1) {
    accountItems.multiple = `${accountIds.length} Accounts`;
  }
  for (const a of accounts) {
    accountItems[a.id] = a.email;
  }

  const currentSelectAccountValue =
    accountIds.length > 1 ? 'multiple' : accountIds.length === 1 ? accountIds[0]! : accountId;

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
          value={currentSelectAccountValue}
          onValueChange={(value) => {
            const val = String(value);
            if (val === 'all') {
              onAccountChange('all');
              onAccountIdsChange([]);
            } else if (val !== 'multiple') {
              onAccountChange(val);
              onAccountIdsChange([val]);
            }
          }}
          items={{ all: ALL_ACCOUNTS, ...accountItems }}
        >
          <SelectTrigger className="w-48" aria-label="Filter akun">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">{ALL_ACCOUNTS}</SelectItem>
            {accountIds.length > 1 && (
              <SelectItem value="multiple">{`${accountIds.length} Accounts`}</SelectItem>
            )}
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

        {/* Popover Filter Lanjutan */}
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant={activeAdvancedCount > 0 ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5"
                aria-label="Filter lanjutan"
              >
                <SlidersHorizontal className="size-3.5" />
                <span>Filters</span>
                {activeAdvancedCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1 text-[10px] bg-background/20 text-current"
                  >
                    {activeAdvancedCount}
                  </Badge>
                )}
              </Button>
            }
          />
          <PopoverContent align="start" className="w-80 sm:w-96 space-y-4 p-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-1.5 font-medium text-sm">
                <Filter className="size-4 text-muted-foreground" />
                <span>Advanced Filters</span>
              </div>
              {activeAdvancedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3 mr-1" />
                  Reset
                </Button>
              )}
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Rentang Tanggal (Updated)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">Dari</span>
                  <Input
                    type="date"
                    value={modifiedAfter ? modifiedAfter.slice(0, 10) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onModifiedAfterChange(
                        val ? new Date(`${val}T00:00:00.000Z`).toISOString() : undefined,
                      );
                    }}
                    className="h-8 text-xs"
                    aria-label="Dari tanggal"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">Sampai</span>
                  <Input
                    type="date"
                    value={modifiedBefore ? modifiedBefore.slice(0, 10) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onModifiedBeforeChange(
                        val ? new Date(`${val}T23:59:59.999Z`).toISOString() : undefined,
                      );
                    }}
                    className="h-8 text-xs"
                    aria-label="Sampai tanggal"
                  />
                </div>
              </div>
            </div>

            {/* Size Range */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">
                  Rentang Ukuran File
                </Label>
                <div className="w-20">
                  <Select
                    value={sizeUnit}
                    onValueChange={(val) => handleUnitChange(val as 'MB' | 'GB')}
                    items={{ MB: 'MB', GB: 'GB' }}
                  >
                    <SelectTrigger className="h-7 text-xs" aria-label="Satuan ukuran">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="MB">MB</SelectItem>
                      <SelectItem value="GB">GB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Min ({sizeUnit})
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={minSizeInput}
                    onChange={(e) => handleMinSizeChange(e.target.value)}
                    className="h-8 text-xs"
                    aria-label="Ukuran minimal"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Max ({sizeUnit})
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Tak terbatas"
                    value={maxSizeInput}
                    onChange={(e) => handleMaxSizeChange(e.target.value)}
                    className="h-8 text-xs"
                    aria-label="Ukuran maksimal"
                  />
                </div>
              </div>
            </div>

            {/* Accounts Multi-Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Akun Google Drive</Label>
              <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-md border p-2">
                {accounts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Tidak ada akun terhubung.</p>
                ) : (
                  accounts.map((account) => {
                    const isChecked = accountIds.includes(account.id);
                    return (
                      <label
                        key={account.id}
                        className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1 rounded"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              onAccountIdsChange([...accountIds, account.id]);
                            } else {
                              onAccountIdsChange(accountIds.filter((id) => id !== account.id));
                            }
                          }}
                        />
                        <span className="truncate">{account.email}</span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {accountIds.length === 0
                  ? 'Semua akun dicari (kosong = semua akun).'
                  : `${accountIds.length} dari ${accounts.length} akun dipilih.`}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t pt-2">
              <Button variant="outline" size="sm" onClick={handleReset} className="h-7 text-xs">
                Reset
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
