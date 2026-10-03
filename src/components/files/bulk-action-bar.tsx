'use client';

import { FolderInput, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DriveFileDto } from '@/lib/google-drive/types';
import { BulkDeleteDialog } from './bulk-delete-dialog';
import { BulkMoveDialog } from './bulk-move-dialog';

interface BulkActionBarProps {
  selectedFiles: DriveFileDto[];
  onClearSelection: () => void;
}

export function BulkActionBar({ selectedFiles, onClearSelection }: BulkActionBarProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  if (selectedFiles.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 bg-card border rounded-full shadow-2xl animate-in slide-in-from-bottom-4">
        <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold">
          {selectedFiles.length} item terpilih
        </Badge>

        <div className="h-4 w-px bg-border" />

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium rounded-full"
          onClick={() => setMoveOpen(true)}
        >
          <FolderInput className="size-3.5" />
          <span>Move ({selectedFiles.length})</span>
        </Button>

        <Button
          variant="destructive"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium rounded-full"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-3.5" />
          <span>Delete ({selectedFiles.length})</span>
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full text-muted-foreground hover:text-foreground"
          onClick={onClearSelection}
          aria-label="Batalkan seleksi"
          title="Batalkan seleksi"
        >
          <X className="size-4" />
        </Button>
      </div>

      <BulkDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        selectedFiles={selectedFiles}
        onSuccess={onClearSelection}
      />

      <BulkMoveDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        selectedFiles={selectedFiles}
        onSuccess={onClearSelection}
      />
    </>
  );
}
