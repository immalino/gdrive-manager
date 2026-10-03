'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api-client';
import type { DriveFileDto } from '@/lib/google-drive/types';
import type { BulkDeleteResponse } from '@/types';

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: DriveFileDto[];
  onSuccess: () => void;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  selectedFiles,
  onSuccess,
}: BulkDeleteDialogProps) {
  const queryClient = useQueryClient();
  const count = selectedFiles.length;

  const mutation = useMutation({
    mutationFn: () => {
      const items = selectedFiles.map((f) => ({
        id: f.id,
        accountId: f.accountId,
        name: f.name,
      }));
      return api.post<BulkDeleteResponse>('/api/files/bulk-delete', { items });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
      if (res.failedCount > 0) {
        toast.warning(
          `Berhasil menghapus ${res.deletedCount} file, ${res.failedCount} file gagal dihapus.`,
        );
      } else {
        toast.success(`Berhasil menghapus ${res.deletedCount} item.`);
      }
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal menghapus file.');
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus {count} Item Terpilih?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus {count} item terpilih? Aksi ini akan memindahkan item
            ke sampah Google Drive.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-48 overflow-y-auto rounded-md border p-2 text-xs space-y-1 my-2">
          {selectedFiles.map((file) => (
            <div
              key={`${file.accountId}:${file.id}`}
              className="flex items-center justify-between gap-2 py-0.5"
            >
              <span className="truncate font-medium">{file.name}</span>
              <span className="shrink-0 text-muted-foreground">{file.accountEmail}</span>
            </div>
          ))}
        </div>

        {mutation.isPending && (
          <div className="space-y-1.5 py-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Menghapus {count} item...</span>
            </div>
            <Progress value={null} className="h-1.5 w-full animate-pulse" />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending || count === 0}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Menghapus...' : 'Hapus Permanen'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
