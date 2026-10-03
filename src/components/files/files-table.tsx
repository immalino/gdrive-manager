'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import {
  AlertCircle,
  Archive,
  File as FileIcon,
  FileText,
  Folder,
  Image,
  Video,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { classifyMime, type FileKind } from '@/lib/files/mime';
import type { SortKey } from '@/lib/files/merge';
import { formatBytes, formatDateTime } from '@/lib/format';
import type { DriveFileDto } from '@/lib/google-drive/types';
import type { FilesResponse, StorageAccountItem, StorageResponse } from '@/types';
import { FileActions } from './file-actions';
import { FilesFilters } from './files-filters';
import { NewFolderButton } from './new-folder-dialog';

const EMPTY_FILES: DriveFileDto[] = [];
const EMPTY_ACCOUNTS: StorageAccountItem[] = [];
const SKELETON_ROWS = 8;

const KIND_ICON: Record<FileKind, typeof FileText> = {
  document: FileText,
  image: Image,
  video: Video,
  archive: Archive,
  other: FileIcon,
  folder: Folder,
};

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, DriveFileDto>();
const columns = helper.columns([
  helper.accessor('name', {
    header: 'Name',
    cell: ({ row }) => {
      const Icon = KIND_ICON[classifyMime(row.original.mimeType)];
      return (
        <div className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{row.original.name}</span>
        </div>
      );
    },
  }),
  helper.accessor('sizeBytes', {
    header: 'Size',
    cell: ({ getValue }) => formatBytes(getValue()),
  }),
  helper.accessor('accountEmail', { header: 'Account' }),
  helper.accessor('modifiedAt', {
    header: 'Updated',
    cell: ({ getValue }) => {
      const value = getValue();
      return value ? formatDateTime(value) : '—';
    },
  }),
  helper.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <FileActions file={row.original} />,
  }),
]);

export interface FilesInitialFilters {
  search: string;
  accountId: string;
  kind: string;
  sort: SortKey;
  dir: 'asc' | 'desc';
}

function buildFilesParams(filters: FilesInitialFilters, includeDefaults = false): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.accountId !== 'all') params.set('accountId', filters.accountId);
  if (filters.kind !== 'all') params.set('kind', filters.kind);
  if (includeDefaults || filters.sort !== 'modified') params.set('sort', filters.sort);
  if (includeDefaults || filters.dir !== 'desc') params.set('dir', filters.dir);
  return params;
}

export function FilesTable({ initial }: { initial: FilesInitialFilters }) {
  const [searchInput, setSearchInput] = useState(initial.search);
  const [search, setSearch] = useState(initial.search);
  const [accountId, setAccountId] = useState(initial.accountId || 'all');
  const [kind, setKind] = useState(initial.kind || 'all');
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [dir, setDir] = useState<'asc' | 'desc'>(initial.dir);

  const filters = useMemo(
    () => ({ search, accountId, kind, sort, dir }),
    [search, accountId, kind, sort, dir],
  );

  useEffect(() => {
    if (searchInput === search) return;
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  const syncedRef = useRef(false);
  useEffect(() => {
    if (!syncedRef.current) {
      syncedRef.current = true;
      return;
    }
    const qs = buildFilesParams(filters).toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [filters]);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['files', filters],
    queryFn: () => api.get<FilesResponse>(`/api/files?${buildFilesParams(filters, true)}`),
    placeholderData: keepPreviousData,
  });

  const { data: storage } = useQuery({
    queryKey: ['storage'],
    queryFn: () => api.get<StorageResponse>('/api/storage'),
  });

  const table = useTable({
    features,
    columns,
    data: data?.files ?? EMPTY_FILES,
    getRowId: (row) => `${row.accountId}:${row.id}`,
  });

  const failedAccounts = data?.failedAccounts ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <FilesFilters
            searchInput={searchInput}
            onSearchChange={setSearchInput}
            accountId={accountId}
            onAccountChange={setAccountId}
            kind={kind}
            onKindChange={setKind}
            sort={sort}
            onSortChange={setSort}
            dir={dir}
            onDirChange={setDir}
            accounts={storage?.accounts ?? EMPTY_ACCOUNTS}
          />
        </div>
        <NewFolderButton />
      </div>

      {failedAccounts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Sebagian akun gagal dimuat</AlertTitle>
          <AlertDescription>Gagal memuat file dari: {failedAccounts.join(', ')}</AlertDescription>
        </Alert>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Gagal memuat file</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Kesalahan tidak diketahui.'}
          </AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={
                    header.column.id === 'name'
                      ? 'w-[45%]'
                      : header.column.id === 'actions'
                        ? 'text-right'
                        : undefined
                  }
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isPending ? (
            Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell>
                  <Skeleton className="h-4 w-2/3" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="ml-auto h-4 w-16" />
                </TableCell>
              </TableRow>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-sm text-muted-foreground"
              >
                Tidak ada file. Coba ubah filter atau hubungkan akun lain.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={
                      cell.column.id === 'actions'
                        ? 'text-right'
                        : cell.column.id === 'name'
                          ? 'max-w-0'
                          : undefined
                    }
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
