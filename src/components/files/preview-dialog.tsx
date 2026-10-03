'use client';

import { ExternalLink, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DriveFileDto } from '@/lib/google-drive/types';

interface Props {
  file: DriveFileDto | null;
  onOpenChange: (open: boolean) => void;
}

export function PreviewDialog({ file, onOpenChange }: Props) {
  const isGoogleNative = file?.mimeType.startsWith('application/vnd.google-apps.') ?? false;
  const isFolder = file?.mimeType === 'application/vnd.google-apps.folder';
  const previewUrl = file ? `https://drive.google.com/file/d/${file.id}/preview` : '';
  const openUrl = file
    ? isFolder
      ? `https://drive.google.com/drive/folders/${file.id}`
      : `https://drive.google.com/open?id=${file.id}`
    : '';
  const downloadHref = file
    ? `/api/files/${encodeURIComponent(file.id)}/download?accountId=${encodeURIComponent(file.accountId)}`
    : '';

  return (
    <Dialog open={!!file} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{file?.name}</DialogTitle>
        </DialogHeader>
        {file && (
          <div className="space-y-3">
            <iframe
              src={previewUrl}
              className="h-[60vh] w-full rounded-md border bg-muted/20"
              title={`Preview ${file.name}`}
              allow="autoplay"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {isGoogleNative
                  ? 'Dokumen Google — pratinjau memerlukan login Google di browser.'
                  : 'Pratinjau via Google Drive viewer.'}
              </span>
              <div className="flex items-center gap-3">
                <a
                  href={openUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline hover:text-foreground"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Buka di Drive</span>
                </a>
                {!isGoogleNative && !isFolder && (
                  <a
                    href={downloadHref}
                    download
                    className="inline-flex items-center gap-1 underline hover:text-foreground"
                  >
                    <Download className="size-3.5" />
                    <span>Download</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
