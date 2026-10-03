'use client';

import { Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DriveFileDto } from '@/lib/google-drive/types';

export function driveFileUrl(file: DriveFileDto): string {
  return file.webViewLink ?? `https://drive.google.com/open?id=${file.id}`;
}

export function FileActions({ file }: { file: DriveFileDto }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        render={
          <a
            href={driveFileUrl(file)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Buka ${file.name} di Google Drive`}
          />
        }
      >
        <ExternalLink />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled
        title="Download tersedia di Sesi 6"
        aria-label={`Download ${file.name}`}
      >
        <Download />
      </Button>
    </div>
  );
}
