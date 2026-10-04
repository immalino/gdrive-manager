'use client';

import {
  Archive,
  File as FileIcon,
  FileText,
  Folder,
  FolderOpen,
  Image,
  Video,
} from 'lucide-react';
import { cn } from 'cn';
import { Skeleton } from '@/components/ui/skeleton';
import { classifyMime, type FileKind } from '@/lib/files/mime';
import { formatBytes, formatDateTime } from '@/lib/format';
import type { DriveFileDto } from '@/lib/google-drive/types';

const KIND_ICON: Record<FileKind, typeof FileText> = {
  document: FileText,
  image: Image,
  video: Video,
  archive: Archive,
  other: FileIcon,
  folder: Folder,
};

export interface FileGridProps {
  files: DriveFileDto[];
  isLoading?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (file: DriveFileDto, isMulti: boolean) => void;
  onNavigateFolder?: (folderId: string) => void;
  onPreview?: (file: DriveFileDto) => void;
  renderActions?: (file: DriveFileDto) => React.ReactNode;
}

export function FileGrid({
  files,
  isLoading,
  selectedIds,
  onSelect,
  onNavigateFolder,
  onPreview,
  renderActions,
}: FileGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-6 flex-1 min-h-0 overflow-auto p-1">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={`f-skel-${i}`} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={`file-skel-${i}`} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-1 min-h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center bg-card/40">
        <FolderOpen className="size-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-foreground">Folder ini kosong</p>
        <p className="text-xs text-muted-foreground mt-1">
          Gunakan tombol + New di toolbar atau drag & drop file ke sini untuk mengunggah.
        </p>
      </div>
    );
  }

  const folders = files.filter((f) => f.mimeType === 'application/vnd.google-apps.folder');
  const regularFiles = files.filter((f) => f.mimeType !== 'application/vnd.google-apps.folder');

  return (
    <div className="flex-1 min-h-0 overflow-auto space-y-6 p-1">
      {/* Folders Section */}
      {folders.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
            Folders
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {folders.map((folder) => {
              const isSelected =
                Boolean(selectedIds?.has(`${folder.accountId}:${folder.id}`)) ||
                Boolean(selectedIds?.has(folder.id));

              return (
                <div
                  key={folder.id}
                  onClick={(e) => onSelect?.(folder, e.ctrlKey || e.metaKey)}
                  onDoubleClick={() => onNavigateFolder?.(folder.id)}
                  className={cn(
                    'group relative flex items-center justify-between gap-2.5 rounded-xl border p-3 cursor-pointer transition-all select-none',
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-xs'
                      : 'bg-card border-border hover:bg-muted/50 hover:border-border/80',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Folder className="size-5 shrink-0 text-amber-500 fill-amber-500/20" />
                    <span
                      className="truncate text-sm font-medium text-foreground"
                      title={folder.name}
                    >
                      {folder.name}
                    </span>
                  </div>
                  {renderActions && (
                    <div
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderActions(folder)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Section */}
      {regularFiles.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
            Files
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {regularFiles.map((file) => {
              const isSelected =
                Boolean(selectedIds?.has(`${file.accountId}:${file.id}`)) ||
                Boolean(selectedIds?.has(file.id));
              const kind = classifyMime(file.mimeType);
              const Icon = KIND_ICON[kind] ?? FileIcon;

              return (
                <div
                  key={file.id}
                  onClick={(e) => onSelect?.(file, e.ctrlKey || e.metaKey)}
                  onDoubleClick={() => onPreview?.(file)}
                  className={cn(
                    'group relative flex flex-col justify-between rounded-xl border p-3.5 cursor-pointer transition-all select-none h-44',
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-xs'
                      : 'bg-card border-border hover:bg-muted/50 hover:border-border/80',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-muted/80 transition-colors">
                      <Icon className="size-5" />
                    </div>
                    {renderActions && (
                      <div
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {renderActions(file)}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto space-y-1 min-w-0">
                    <p
                      className="truncate text-sm font-medium text-foreground leading-tight"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{formatBytes(file.sizeBytes)}</span>
                      <span>{file.modifiedAt ? formatDateTime(file.modifiedAt) : '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
