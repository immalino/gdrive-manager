'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api-client';
import type { DriveFileDto } from '@/lib/google-drive/types';
import type { BulkMoveResponse, FoldersResponse } from '@/types';

interface BulkMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: DriveFileDto[];
  onSuccess: () => void;
}

export function BulkMoveDialog({
  open,
  onOpenChange,
  selectedFiles,
  onSuccess,
}: BulkMoveDialogProps) {
  const queryClient = useQueryClient();

  const [targetFolderId, setTargetFolderId] = useState('root');
  const [folderFilter, setFolderFilter] = useState('');

  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.get<FoldersResponse>('/api/folders'),
    enabled: open,
  });

  const selectedFolderIds = useMemo(() => new Set(selectedFiles.map((f) => f.id)), [selectedFiles]);

  const availableFolders = useMemo(() => {
    const list = (foldersData?.folders ?? []).filter((f) => !selectedFolderIds.has(f.id));
    if (!folderFilter.trim()) return list;
    const q = folderFilter.toLowerCase();
    return list.filter((f) => f.name.toLowerCase().includes(q));
  }, [foldersData, selectedFolderIds, folderFilter]);

  const folderSelectItems = useMemo(() => {
    const map: Record<string, string> = { root: 'Root (My Drive)' };
    for (const f of foldersData?.folders ?? []) {
      map[f.id] = f.name;
    }
    return map;
  }, [foldersData]);

  const mutation = useMutation({
    mutationFn: () => {
      const items = selectedFiles.map((f) => ({
        id: f.id,
        accountId: f.accountId,
        fromFolderId: f.parentId ?? null,
      }));
      return api.post<BulkMoveResponse>('/api/files/bulk-move', {
        items,
        targetFolderId: targetFolderId === 'root' ? null : targetFolderId,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      const destName = folderSelectItems[targetFolderId] || 'folder tujuan';
      if (res.failedCount > 0) {
        toast.warning(
          `Berhasil memindahkan ${res.movedCount} file ke ${destName}, ${res.failedCount} file gagal dipindahkan.`,
        );
      } else {
        toast.success(`Berhasil memindahkan ${res.movedCount} item ke ${destName}.`);
      }
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal memindahkan file.');
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setTargetFolderId('root');
          setFolderFilter('');
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pindahkan File</DialogTitle>
          <DialogDescription>
            Pindahkan {selectedFiles.length} item terpilih ke folder tujuan di Shared Drive.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Item yang akan dipindahkan ({selectedFiles.length} item):
              </span>
            </div>
            <div className="max-h-32 overflow-y-auto rounded-md border p-2 text-xs space-y-1">
              {selectedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="truncate font-medium">{file.name}</span>
                  <span className="shrink-0 text-muted-foreground">{file.accountEmail}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Folder Tujuan</Label>
            {foldersLoading ? (
              <p className="text-xs text-muted-foreground">Memuat daftar folder...</p>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Filter nama folder..."
                  value={folderFilter}
                  onChange={(e) => setFolderFilter(e.target.value)}
                  className="h-8 text-xs"
                />
                <Select
                  value={targetFolderId}
                  onValueChange={(val) => setTargetFolderId(String(val))}
                  items={folderSelectItems}
                >
                  <SelectTrigger className="w-full" aria-label="Pilih folder tujuan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="root">Root (My Drive)</SelectItem>
                    {availableFolders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {mutation.isPending && (
            <div className="space-y-1.5 py-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Memindahkan {selectedFiles.length} item...</span>
              </div>
              <Progress value={null} className="h-1.5 w-full animate-pulse" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            disabled={mutation.isPending || selectedFiles.length === 0 || foldersLoading}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Memindahkan...' : `Pindahkan (${selectedFiles.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
