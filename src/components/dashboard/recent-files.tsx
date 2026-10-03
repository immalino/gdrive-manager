'use client';

import Link from 'next/link';
import {
  Archive,
  File as FileIcon,
  FileText,
  Folder,
  FolderOpen,
  Image,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

interface RecentFilesProps {
  files?: DriveFileDto[];
  isLoading?: boolean;
}

export function RecentFiles({ files = [], isLoading }: RecentFilesProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Recent Files</CardTitle>
          <CardDescription>File yang baru diperbarui di seluruh akun.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/files" />}>
          Lihat semua
        </Button>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Skeleton className="size-4 shrink-0 rounded" />
                  <div className="space-y-1 min-w-0 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-3 w-12 ml-auto" />
                  <Skeleton className="h-3 w-16 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderOpen className="mb-2 size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Belum ada file</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Unggah file atau hubungkan akun Google Drive.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {files.map((file) => {
              const Icon = KIND_ICON[classifyMime(file.mimeType)];
              return (
                <div
                  key={`${file.accountId}:${file.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 transition-colors first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3 flex-1">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-none" title={file.name}>
                        {file.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground mt-1">
                        {file.accountEmail}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium tabular-nums">
                      {formatBytes(file.sizeBytes)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {file.modifiedAt ? formatDateTime(file.modifiedAt) : '—'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
