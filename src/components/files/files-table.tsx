'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  createColumnHelper,
  rowSelectionFeature,
  tableFeatures,
  useTable,
  type RowSelectionState,
} from '@tanstack/react-table';
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
import { useSearchParams } from 'next/navigation';
import { cn } from 'cn';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, ApiError } from '@/lib/api-client';
import { classifyMime, type FileKind } from '@/lib/files/mime';
import type { SortKey } from '@/lib/files/merge';
import { formatBytes, formatDateTime } from '@/lib/format';
import type { DriveFileDto } from '@/lib/google-drive/types';
import type { BreadcrumbItem, FilesResponse, StorageAccountItem, StorageResponse } from '@/types';
import { Breadcrumb } from '@/components/file-browser/breadcrumb';
import { Toolbar } from '@/components/file-browser/toolbar';
import { FileGrid } from '@/components/file-browser/file-grid';
import { BulkActionBar } from './bulk-action-bar';
import { FileActions } from './file-actions';
import { FilesFilters } from './files-filters';
import { PreviewDialog } from './preview-dialog';
import { useViewModePreference } from '@/lib/view-mode';

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

const features = tableFeatures({ rowSelectionFeature });
const helper = createColumnHelper<typeof features, DriveFileDto>();

export interface FilesInitialFilters {
  folderId?: string;
  search: string;
  accountId: string;
  accountIds?: string[];
  kind: string;
  sort: SortKey;
  dir: 'asc' | 'desc';
  sizeMin?: number;
  sizeMax?: number;
  modifiedAfter?: string;
  modifiedBefore?: string;
}

interface FilesFilterState {
  folderId?: string;
  search: string;
  accountId: string;
  accountIds: string[];
  kind: string;
  sort: SortKey;
  dir: 'asc' | 'desc';
  sizeMin?: number;
  sizeMax?: number;
  modifiedAfter?: string;
  modifiedBefore?: string;
}

function buildFilesParams(filters: FilesFilterState, includeDefaults = false): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.folderId) params.set('folderId', filters.folderId);
  if (filters.search) params.set('search', filters.search);
  if (filters.accountIds && filters.accountIds.length > 0) {
    params.set('accountIds', filters.accountIds.join(','));
  } else if (filters.accountId && filters.accountId !== 'all') {
    params.set('accountId', filters.accountId);
  }
  if (filters.kind !== 'all') params.set('kind', filters.kind);
  if (includeDefaults || filters.sort !== 'modified') params.set('sort', filters.sort);
  if (includeDefaults || filters.dir !== 'desc') params.set('dir', filters.dir);
  if (filters.sizeMin != null) params.set('sizeMin', String(filters.sizeMin));
  if (filters.sizeMax != null) params.set('sizeMax', String(filters.sizeMax));
  if (filters.modifiedAfter) params.set('modifiedAfter', filters.modifiedAfter);
  if (filters.modifiedBefore) params.set('modifiedBefore', filters.modifiedBefore);
  return params;
}

export function FilesTable({
  initial,
  folderId: propFolderId,
  onNavigateFolder,
  onBreadcrumbLoaded,
  showAccountColumn = false,
  viewMode: propViewMode,
  onViewModeChange,
}: {
  initial?: Partial<FilesInitialFilters>;
  folderId?: string;
  onNavigateFolder?: (folderId: string) => void;
  onBreadcrumbLoaded?: (items: BreadcrumbItem[]) => void;
  showAccountColumn?: boolean;
  viewMode?: 'list' | 'grid';
  onViewModeChange?: (mode: 'list' | 'grid') => void;
}) {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') ?? '';
  const lastUrlSearchRef = useRef(urlSearch);

  const [folderId, setFolderId] = useState<string | undefined>(propFolderId ?? initial?.folderId);
  const [searchInput, setSearchInput] = useState(initial?.search ?? '');
  const [search, setSearch] = useState(initial?.search ?? '');
  const [accountId, setAccountId] = useState(initial?.accountId || 'all');
  const [accountIds, setAccountIds] = useState<string[]>(
    initial?.accountIds ??
      (initial?.accountId && initial.accountId !== 'all' ? [initial.accountId] : []),
  );
  const [kind, setKind] = useState(initial?.kind || 'all');
  const [sort, setSort] = useState<SortKey>(initial?.sort ?? 'modified');
  const [dir, setDir] = useState<'asc' | 'desc'>(initial?.dir ?? 'desc');
  const [sizeMin, setSizeMin] = useState<number | undefined>(initial?.sizeMin);
  const [sizeMax, setSizeMax] = useState<number | undefined>(initial?.sizeMax);
  const [modifiedAfter, setModifiedAfter] = useState<string | undefined>(initial?.modifiedAfter);
  const [modifiedBefore, setModifiedBefore] = useState<string | undefined>(initial?.modifiedBefore);

  const [preferredViewMode, setPreferredViewMode] = useViewModePreference();
  const viewMode = propViewMode ?? preferredViewMode;
  const [showFilters, setShowFilters] = useState(true);

  const handleViewModeChange = (mode: 'list' | 'grid') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setPreferredViewMode(mode);
    }
  };

  const [previewFile, setPreviewFile] = useState<DriveFileDto | null>(null);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const lastClickedIndexRef = useRef<number | null>(null);

  const filters: FilesFilterState = useMemo(
    () => ({
      folderId,
      search,
      accountId,
      accountIds,
      kind,
      sort,
      dir,
      sizeMin,
      sizeMax,
      modifiedAfter,
      modifiedBefore,
    }),
    [
      folderId,
      search,
      accountId,
      accountIds,
      kind,
      sort,
      dir,
      sizeMin,
      sizeMax,
      modifiedAfter,
      modifiedBefore,
    ],
  );

  const [prevPropFolderId, setPrevPropFolderId] = useState(propFolderId);
  if (propFolderId !== prevPropFolderId) {
    setPrevPropFolderId(propFolderId);
    setFolderId(propFolderId);
  }

  const handleFolderClick = (clickedFolderId: string) => {
    setFolderId(clickedFolderId);
    if (onNavigateFolder) {
      onNavigateFolder(clickedFolderId);
    } else {
      const sp = new URLSearchParams(window.location.search);
      sp.set('folderId', clickedFolderId);
      window.history.pushState(null, '', `?${sp.toString()}`);
    }
  };

  useEffect(() => {
    if (urlSearch !== lastUrlSearchRef.current) {
      lastUrlSearchRef.current = urlSearch;
      setSearchInput(urlSearch);
      setSearch(urlSearch);
    }
  }, [urlSearch]);

  useEffect(() => {
    if (searchInput === search) return;
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => {
    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const newFolderId = sp.get('folderId') || undefined;
      setFolderId(newFolderId);
      const newSearch = sp.get('search') ?? '';
      setSearchInput(newSearch);
      setSearch(newSearch);
      const newKind = sp.get('kind') ?? 'all';
      setKind(newKind);
      const newSort = (sp.get('sort') as SortKey) ?? 'modified';
      setSort(newSort);
      const newDir = (sp.get('dir') as 'asc' | 'desc') ?? 'desc';
      setDir(newDir);
      const accIds = sp.get('accountIds');
      const accId = sp.get('accountId');
      if (accIds) {
        setAccountIds(accIds.split(',').filter(Boolean));
      } else if (accId && accId !== 'all') {
        setAccountIds([accId]);
      } else {
        setAccountIds([]);
      }
      setAccountId(accId ?? 'all');
      const sMin = sp.get('sizeMin');
      setSizeMin(sMin ? Number(sMin) : undefined);
      const sMax = sp.get('sizeMax');
      setSizeMax(sMax ? Number(sMax) : undefined);
      setModifiedAfter(sp.get('modifiedAfter') ?? undefined);
      setModifiedBefore(sp.get('modifiedBefore') ?? undefined);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const syncedRef = useRef(false);
  useEffect(() => {
    if (!syncedRef.current) {
      syncedRef.current = true;
      return;
    }
    const qs = buildFilesParams(filters).toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [filters]);

  const [prevFilters, setPrevFilters] = useState(filters);
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    setRowSelection({});
  }

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['files', filters],
    queryFn: () => api.get<FilesResponse>(`/api/files?${buildFilesParams(filters, true)}`),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (data?.breadcrumb && onBreadcrumbLoaded) {
      onBreadcrumbLoaded(data.breadcrumb);
    }
  }, [data?.breadcrumb, onBreadcrumbLoaded]);

  const { data: storage } = useQuery({
    queryKey: ['storage'],
    queryFn: () => api.get<StorageResponse>('/api/storage'),
  });

  const columns = helper.columns([
    helper.display({
      id: 'select',
      header: ({ table }) => {
        const isAllSelected = table.getIsAllPageRowsSelected();
        const isSomeSelected = table.getIsSomePageRowsSelected();
        return (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={isAllSelected}
              indeterminate={!isAllSelected && isSomeSelected}
              onCheckedChange={(checked) => {
                table.toggleAllPageRowsSelected(!!checked);
              }}
              aria-label="Pilih semua file di halaman ini"
            />
          </div>
        );
      },
      cell: ({ row, table }) => (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onClick={(e) => {
              e.stopPropagation();
              const isShift = e.shiftKey;
              const targetState = !row.getIsSelected();
              const prevIndex =
                table.getSelectedRowModel().rows.length === 0 ? null : lastClickedIndexRef.current;

              if (isShift && prevIndex !== null) {
                const start = Math.min(prevIndex, row.index);
                const end = Math.max(prevIndex, row.index);
                const rows = table.getRowModel().rows;
                setRowSelection((prev) => {
                  const next: RowSelectionState = { ...prev };
                  for (let i = start; i <= end; i++) {
                    const r = rows[i];
                    if (r) {
                      if (targetState) {
                        next[r.id] = true;
                      } else {
                        delete next[r.id];
                      }
                    }
                  }
                  return next;
                });
              } else {
                row.toggleSelected(targetState);
              }
              lastClickedIndexRef.current = row.index;
            }}
            onCheckedChange={(checked) => {
              if (row.getIsSelected() !== !!checked) {
                row.toggleSelected(!!checked);
                lastClickedIndexRef.current = row.index;
              }
            }}
            aria-label={`Pilih ${row.original.name}`}
          />
        </div>
      ),
    }),
    helper.accessor('name', {
      header: 'Name',
      cell: ({ row }) => {
        const isFolder = row.original.mimeType === 'application/vnd.google-apps.folder';
        const Icon = KIND_ICON[classifyMime(row.original.mimeType)];
        return (
          <div
            className={cn('flex items-center gap-2', isFolder && 'hover:underline text-foreground')}
            title={row.original.accountEmail ? `Owner: ${row.original.accountEmail}` : undefined}
            onClick={(e) => {
              if (isFolder) {
                e.stopPropagation();
                handleFolderClick(row.original.id);
              }
            }}
          >
            <Icon
              className={cn(
                'size-4 shrink-0',
                isFolder ? 'text-amber-500 fill-amber-500/20' : 'text-muted-foreground',
              )}
            />
            <span className="truncate font-medium">{row.original.name}</span>
          </div>
        );
      },
    }),
    helper.accessor('sizeBytes', {
      header: 'Size',
      cell: ({ getValue }) => formatBytes(getValue()),
    }),
    ...(showAccountColumn ? [helper.accessor('accountEmail', { header: 'Account' })] : []),
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
      cell: ({ row }) => (
        <FileActions
          file={row.original}
          onPreview={
            row.original.mimeType !== 'application/vnd.google-apps.folder'
              ? () => setPreviewFile(row.original)
              : undefined
          }
        />
      ),
    }),
  ]);

  const table = useTable({
    features,
    columns,
    data: data?.files ?? EMPTY_FILES,
    getRowId: (row) => `${row.accountId}:${row.id}`,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
  });

  const selectedFiles = table.getSelectedRowModel().rows.map((r) => r.original);

  const failedAccounts = data?.failedAccounts ?? [];

  const handleResetAdvanced = () => {
    setSizeMin(undefined);
    setSizeMax(undefined);
    setModifiedAfter(undefined);
    setModifiedBefore(undefined);
    setAccountIds([]);
    setAccountId('all');
  };

  const activeFilterCount =
    (kind !== 'all' ? 1 : 0) +
    (sizeMin != null ? 1 : 0) +
    (sizeMax != null ? 1 : 0) +
    (modifiedAfter ? 1 : 0) +
    (modifiedBefore ? 1 : 0);

  const selectedRowIds = useMemo(() => new Set(Object.keys(rowSelection)), [rowSelection]);

  const handleGridSelect = (file: DriveFileDto, isMulti: boolean) => {
    const rowId = `${file.accountId}:${file.id}`;
    if (isMulti) {
      setRowSelection((prev) => {
        const next = { ...prev };
        if (next[rowId]) {
          delete next[rowId];
        } else {
          next[rowId] = true;
        }
        return next;
      });
    } else {
      setRowSelection((prev) => {
        if (prev[rowId] && Object.keys(prev).length === 1) {
          return {};
        }
        return { [rowId]: true };
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 space-y-3">
      {!onBreadcrumbLoaded && data?.breadcrumb && (
        <div className="shrink-0">
          <Breadcrumb items={data.breadcrumb} onNavigate={handleFolderClick} />
        </div>
      )}

      <Toolbar
        parentFolderId={folderId}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        sort={sort}
        onSortChange={setSort}
        dir={dir}
        onDirChange={setDir}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((prev) => !prev)}
        activeFilterCount={activeFilterCount}
      />

      {showFilters && (
        <div className="shrink-0">
          <FilesFilters
            searchInput={searchInput}
            onSearchChange={setSearchInput}
            accountId={accountId}
            onAccountChange={setAccountId}
            accountIds={accountIds}
            onAccountIdsChange={setAccountIds}
            kind={kind}
            onKindChange={setKind}
            sort={sort}
            onSortChange={setSort}
            dir={dir}
            onDirChange={setDir}
            sizeMin={sizeMin}
            onSizeMinChange={setSizeMin}
            sizeMax={sizeMax}
            onSizeMaxChange={setSizeMax}
            modifiedAfter={modifiedAfter}
            onModifiedAfterChange={setModifiedAfter}
            modifiedBefore={modifiedBefore}
            onModifiedBeforeChange={setModifiedBefore}
            onResetAdvanced={handleResetAdvanced}
            accounts={storage?.accounts ?? EMPTY_ACCOUNTS}
          />
        </div>
      )}

      {failedAccounts.length > 0 && (
        <Alert variant="destructive" className="shrink-0">
          <AlertCircle />
          <AlertTitle>Sebagian akun gagal dimuat</AlertTitle>
          <AlertDescription>Gagal memuat file dari: {failedAccounts.join(', ')}</AlertDescription>
        </Alert>
      )}

      {isError && (
        <Alert variant="destructive" className="shrink-0">
          <AlertCircle />
          <AlertTitle>Gagal memuat file</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError
              ? `[${error.code}] ${error.message}`
              : error instanceof Error
                ? error.message
                : 'Kesalahan tidak diketahui.'}
          </AlertDescription>
        </Alert>
      )}

      {viewMode === 'list' ? (
        <Table containerClassName="flex-1 min-h-0 overflow-auto rounded-md border bg-card">
          <TableHeader className="sticky top-0 z-10 bg-card border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-card hover:bg-card">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'bg-card',
                      header.column.id === 'select'
                        ? 'w-10 px-2'
                        : header.column.id === 'name'
                          ? 'w-[45%]'
                          : header.column.id === 'actions'
                            ? 'text-right'
                            : undefined,
                    )}
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
                  <TableCell className="w-10 px-2 text-center">
                    <Skeleton className="h-4 w-4 mx-auto" />
                  </TableCell>
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
                  Empty folder
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isFolder = row.original.mimeType === 'application/vnd.google-apps.folder';
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                    onClick={() => {
                      if (isFolder) {
                        handleFolderClick(row.original.id);
                      }
                    }}
                    onDoubleClick={() => {
                      if (!isFolder) {
                        setPreviewFile(row.original);
                      }
                    }}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {row.getAllCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={
                          cell.column.id === 'select'
                            ? 'w-10 px-2 text-center'
                            : cell.column.id === 'actions'
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
                );
              })
            )}
          </TableBody>
        </Table>
      ) : (
        <FileGrid
          files={data?.files ?? EMPTY_FILES}
          isLoading={isPending}
          selectedIds={selectedRowIds}
          onSelect={handleGridSelect}
          onNavigateFolder={handleFolderClick}
          onPreview={(file: DriveFileDto) => setPreviewFile(file)}
          renderActions={(file: DriveFileDto) => (
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

      <BulkActionBar
        selectedFiles={selectedFiles}
        onClearSelection={() => {
          setRowSelection({});
          lastClickedIndexRef.current = null;
        }}
      />
    </div>
  );
}
