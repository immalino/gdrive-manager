'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Archive,
  ArrowUpDown,
  Clock,
  File as FileIcon,
  FileText,
  Folder,
  Image,
  LayoutGrid,
  List,
  RefreshCw,
  Video,
} from 'lucide-react';
import { cn } from 'cn';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileActions } from '@/components/files/file-actions';
import { PreviewDialog } from '@/components/files/preview-dialog';
import { FileGrid } from '@/components/file-browser/file-grid';
import { api, ApiError } from '@/lib/api-client';
import { classifyMime, type FileKind } from '@/lib/files/mime';
import { sortFiles, type SortKey } from '@/lib/files/merge';
import { formatBytes, formatDateTime } from '@/lib/format';
import { useViewModePreference } from '@/lib/view-mode';
import type { DriveFileDto } from '@/lib/google-drive/types';
import type { FilesResponse } from '@/types';

const KIND_ICON: Record<FileKind, typeof FileText> = {
  document: FileText,
  image: Image,
  video: Video,
  archive: Archive,
  other: FileIcon,
  folder: Folder,
};

const SORT_ITEMS: Record<SortKey, string> = {
  modified: 'Last modified',
  name: 'Name',
  size: 'File size',
};

const SKELETON_ROWS = 8;

function formatErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return `[${err.code}] ${err.message}`;
  if (err instanceof Error) return err.message;
  return 'Kesalahan tidak diketahui.';
}

export default function RecentPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useViewModePreference();
  const [sort, setSort] = useState<SortKey>('modified');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [previewFile, setPreviewFile] = useState<DriveFileDto | null>(null);

  const { data, isPending, isError, error, isRefetching } = useQuery({
    queryKey: ['files', { recent: true }],
    queryFn: () => {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return api.get<FilesResponse>(
        `/api/files?recent=1&limit=100&modifiedAfter=${encodeURIComponent(cutoff)}`,
      );
    },
  });

  const files = useMemo(() => {
    const raw = data?.files ?? [];
    return sortFiles(raw, sort, dir);
  }, [data?.files, sort, dir]);

  return (
    <div className="flex flex-1 flex-col min-h-0 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Clock className="size-6 text-primary shrink-0" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Recent</h1>
            <p className="text-sm text-muted-foreground">
              File yang dimodifikasi dalam 7 hari terakhir.
            </p>
          </div>
        </div>

        {/* Toolbar: Sort, Refresh, View Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['files'] })}
            disabled={isPending || isRefetching}
            className="h-8 text-xs"
          >
            <RefreshCw className={`mr-1.5 size-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Perbarui
          </Button>

          <div className="flex items-center gap-1">
            <Select
              value={sort}
              onValueChange={(val) => setSort(val as SortKey)}
              items={SORT_ITEMS}
            >
              <SelectTrigger className="h-8 text-xs w-32" aria-label="Sort by">
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
              onClick={() => setDir(dir === 'asc' ? 'desc' : 'asc')}
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
              onClick={() => setViewMode('list')}
              title="List view"
              aria-label="List view"
            >
              <List className="size-3.5" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-7 rounded-md"
              onClick={() => setViewMode('grid')}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive" className="shrink-0">
          <AlertCircle />
          <AlertTitle>Gagal memuat file terbaru</AlertTitle>
          <AlertDescription>{formatErrorMessage(error)}</AlertDescription>
        </Alert>
      )}

      {viewMode === 'list' ? (
        <Table containerClassName="flex-1 min-h-0 overflow-auto rounded-md border bg-card">
          <TableHeader className="sticky top-0 z-10 bg-card border-b">
            <TableRow className="bg-card hover:bg-card">
              <TableHead className="w-[50%]">Name</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-2/3" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))
            ) : files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-sm text-muted-foreground">
                  Tidak ada file yang dimodifikasi dalam 7 hari terakhir.
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => {
                const kind = classifyMime(file.mimeType);
                const Icon = KIND_ICON[kind] ?? FileIcon;
                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

                return (
                  <TableRow
                    key={file.id}
                    onDoubleClick={() => {
                      if (!isFolder) setPreviewFile(file);
                    }}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="max-w-0">
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            'size-4.5 shrink-0',
                            isFolder ? 'text-amber-500 fill-amber-500/20' : 'text-muted-foreground',
                          )}
                        />
                        <span className="truncate font-medium" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums text-xs">
                      {formatBytes(file.sizeBytes)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {file.modifiedAt ? formatDateTime(file.modifiedAt) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <FileActions
                        file={file}
                        onPreview={!isFolder ? () => setPreviewFile(file) : undefined}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      ) : (
        <FileGrid
          files={files}
          isLoading={isPending}
          onPreview={(file) => setPreviewFile(file)}
          renderActions={(file) => (
            <FileActions
              file={file}
              onPreview={
                file.mimeType !== 'application/vnd.google-apps.folder'
                  ? () => setPreviewFile(file)
                  : undefined
              }
            />
          )}
        />
      )}

      <PreviewDialog
        file={previewFile}
        onOpenChange={(open) => {
          if (!open) setPreviewFile(null);
        }}
      />
    </div>
  );
}
