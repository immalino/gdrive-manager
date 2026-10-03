'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, ExternalLink, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import type { DriveFileDto } from '@/lib/google-drive/types';

export function driveFileUrl(file: DriveFileDto): string {
  return file.webViewLink ?? `https://drive.google.com/open?id=${file.id}`;
}

export function FileActions({ file }: { file: DriveFileDto }) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () =>
      api.delete<{ deleted: boolean }>(
        `/api/files/${encodeURIComponent(file.id)}?accountId=${encodeURIComponent(file.accountId)}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
      toast.success(`File ${file.name} dihapus.`);
      setConfirmOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const downloadHref = `/api/files/${encodeURIComponent(file.id)}/download?accountId=${encodeURIComponent(file.accountId)}`;

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
        render={<a href={downloadHref} download aria-label={`Download ${file.name}`} />}
      >
        <Download />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Hapus ${file.name}`}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="text-destructive" />
      </Button>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus file ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {file.name} akan dihapus permanen dari Google Drive {file.accountEmail}. Tindakan ini
              tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
