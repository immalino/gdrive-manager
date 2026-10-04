'use client';

import { useState } from 'react';
import {
  ArrowUpDown,
  ChevronDown,
  FolderPlus,
  LayoutGrid,
  List,
  Plus,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NewFolderDialog } from '@/components/files/new-folder-dialog';
import { UploadDialog } from '@/components/upload/upload-dialog';
import type { SortKey } from '@/lib/files/merge';

export interface ToolbarProps {
  parentFolderId?: string;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  dir: 'asc' | 'desc';
  onDirChange: (dir: 'asc' | 'desc') => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  activeFilterCount?: number;
}

const SORT_ITEMS: Record<SortKey, string> = {
  modified: 'Last modified',
  name: 'Name',
  size: 'File size',
};

export function Toolbar({
  parentFolderId,
  viewMode,
  onViewModeChange,
  sort,
  onSortChange,
  dir,
  onDirChange,
  showFilters,
  onToggleFilters,
  activeFilterCount = 0,
}: ToolbarProps) {
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-border/60">
      {/* Left: + New button + Filter toggle */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button className="gap-2 font-medium shadow-xs">
                <Plus className="size-4" />
                <span>New</span>
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="size-4 mr-2 text-muted-foreground" />
              <span>New folder</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setUploadOpen(true)}>
              <Upload className="size-4 mr-2 text-muted-foreground" />
              <span>Upload files</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {onToggleFilters && (
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={onToggleFilters}
            className="gap-1.5 text-xs"
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="size-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="h-4 px-1 text-[10px] bg-primary/20 text-foreground"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* Right: Sort controls & View Toggle */}
      <div className="flex items-center gap-2 ml-auto">
        <div className="flex items-center gap-1">
          <Select
            value={sort}
            onValueChange={(val) => onSortChange(val as SortKey)}
            items={SORT_ITEMS}
          >
            <SelectTrigger className="h-8 text-xs w-32 sm:w-36" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {(Object.keys(SORT_ITEMS) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_ITEMS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={() => onDirChange(dir === 'asc' ? 'desc' : 'asc')}
            title={dir === 'asc' ? 'Ascending' : 'Descending'}
            aria-label="Toggle sort direction"
          >
            <ArrowUpDown className="size-3.5" />
          </Button>
        </div>

        <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-7 rounded-md"
            onClick={() => onViewModeChange('list')}
            title="List view"
            aria-label="List view"
          >
            <List className="size-3.5" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-7 rounded-md"
            onClick={() => onViewModeChange('grid')}
            title="Grid view"
            aria-label="Grid view"
          >
            <LayoutGrid className="size-3.5" />
          </Button>
        </div>
      </div>

      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        parentFolderId={parentFolderId}
      />
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        parentFolderId={parentFolderId}
      />
    </div>
  );
}
