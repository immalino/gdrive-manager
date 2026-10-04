'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api-client';
import { formatBytes } from '@/lib/format';
import type { DriveFileDto } from '@/lib/google-drive/types';
import type { StorageResponse } from '@/types';

export interface MigrateFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: DriveFileDto;
  preselectedTargetAccountId?: string;
  onSuccess?: () => void;
}

export function MigrateFileDialog({
  open,
  onOpenChange,
  file,
  preselectedTargetAccountId,
  onSuccess,
}: MigrateFileDialogProps) {
  const queryClient = useQueryClient();
  const [targetAccountId, setTargetAccountId] = useState<string>(preselectedTargetAccountId ?? '');

  const { data: storageData } = useQuery({
    queryKey: ['storage'],
    queryFn: () => api.get<StorageResponse>('/api/storage'),
    enabled: open,
  });

  const availableAccounts = (storageData?.accounts ?? []).filter(
    (acc) => acc.id !== file.accountId && acc.status === 'connected',
  );

  const migrateMutation = useMutation({
    mutationFn: () =>
      api.post<{ success: boolean; newFile: DriveFileDto }>('/api/files/migrate', {
        fileId: file.id,
        targetAccountId,
        sourceAccountId: file.accountId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
      queryClient.invalidateQueries({ queryKey: ['storage-balancing'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success(`File "${file.name}" berhasil dimigrasikan ke akun tujuan.`);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal memigrasikan file.');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ArrowRightLeft className="size-4" />
            </div>
            <div>
              <DialogTitle>Migrasi File Antar Akun</DialogTitle>
              <DialogDescription>
                Pindahkan kuota file ke akun lain tanpa mengubah lokasinya di folder.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info File */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nama File:</span>
              <span className="font-medium text-foreground truncate max-w-[220px]">
                {file.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ukuran:</span>
              <span className="font-medium text-foreground">
                {file.sizeBytes ? formatBytes(file.sizeBytes) : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Akun Saat Ini:</span>
              <span className="font-medium text-foreground truncate max-w-[220px]">
                {file.accountEmail || 'Akun Sumber'}
              </span>
            </div>
          </div>

          {/* Target Account Selector */}
          <div className="space-y-2">
            <Label htmlFor="target-account">Pilih Akun Tujuan</Label>
            {availableAccounts.length === 0 ? (
              <p className="text-xs text-amber-500">
                Tidak ada akun pool lain yang terhubung untuk menerima file ini.
              </p>
            ) : (
              <Select
                value={targetAccountId}
                onValueChange={(val) => setTargetAccountId(val ?? '')}
                disabled={migrateMutation.isPending}
              >
                <SelectTrigger id="target-account" className="w-full">
                  <SelectValue placeholder="Pilih akun penerima..." />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.map((acc) => {
                    const freeText =
                      acc.freeBytes !== null ? formatBytes(acc.freeBytes) : 'Unlimited';
                    return (
                      <SelectItem key={acc.id} value={acc.id}>
                        <div className="flex items-center justify-between gap-4 w-full text-xs">
                          <span className="truncate">{acc.email}</span>
                          <span className="text-muted-foreground font-mono">(sisa {freeText})</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-md bg-blue-500/10 p-2.5 text-xs text-blue-500">
            <Sparkles className="size-4 shrink-0 mt-0.5" />
            <p>
              File akan di-download lalu di-upload ulang via akun tujuan ke folder yang sama.
              Kuotanya akan ditanggung oleh akun tujuan.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={migrateMutation.isPending}
          >
            Batal
          </Button>
          <Button
            onClick={() => migrateMutation.mutate()}
            disabled={
              !targetAccountId || migrateMutation.isPending || availableAccounts.length === 0
            }
          >
            {migrateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Memigrasikan...
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 size-4" />
                Migrasi
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
