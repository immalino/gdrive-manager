'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

  const accountsMap = useMemo(() => {
    const map = new Map<
      string,
      { accountId: string; accountEmail: string; files: DriveFileDto[] }
    >();
    for (const f of selectedFiles) {
      const existing = map.get(f.accountId);
      if (existing) {
        existing.files.push(f);
      } else {
        map.set(f.accountId, {
          accountId: f.accountId,
          accountEmail: f.accountEmail,
          files: [f],
        });
      }
    }
    return map;
  }, [selectedFiles]);

  const accountList = useMemo(() => Array.from(accountsMap.values()), [accountsMap]);
  const isMultiAccount = accountList.length > 1;

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [targetFolderId, setTargetFolderId] = useState('root');
  const [folderFilter, setFolderFilter] = useState('');

  const activeAccount =
    (selectedAccountId ? accountsMap.get(selectedAccountId) : null) ?? accountList[0];
  const activeAccountId = activeAccount?.accountId ?? '';
  const filesToMove = useMemo(() => activeAccount?.files ?? [], [activeAccount]);

  const accountSelectItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const acc of accountList) {
      map[acc.accountId] = `${acc.accountEmail} (${acc.files.length} item)`;
    }
    return map;
  }, [accountList]);

  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders', activeAccountId],
    queryFn: () =>
      api.get<FoldersResponse>(`/api/folders?accountId=${encodeURIComponent(activeAccountId)}`),
    enabled: open && !!activeAccountId,
  });

  const selectedFolderIds = useMemo(() => new Set(filesToMove.map((f) => f.id)), [filesToMove]);

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
      const items = filesToMove.map((f) => ({
        id: f.id,
        accountId: f.accountId,
        fromFolderId: f.parentId ?? null,
      }));
      return api.post<BulkMoveResponse>('/api/files/bulk-move', {
        items,
        targetAccountId: activeAccountId,
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
          setSelectedAccountId(null);
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
            Pindahkan file terpilih ke folder tujuan di Google Drive.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isMultiAccount && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>File Lintas Akun Terdeteksi</AlertTitle>
              <AlertDescription className="text-xs">
                Pemindahan massal hanya didukung dalam satu akun yang sama. Pilih akun yang ingin
                Anda proses di bawah ini.
              </AlertDescription>
            </Alert>
          )}

          {isMultiAccount && (
            <div className="space-y-1.5">
              <Label>Pilih Akun yang Diproses</Label>
              <Select
                value={activeAccountId}
                onValueChange={(val) => {
                  setSelectedAccountId(String(val));
                  setTargetFolderId('root');
                }}
                items={accountSelectItems}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountList.map((acc) => (
                    <SelectItem key={acc.accountId} value={acc.accountId}>
                      {acc.accountEmail} ({acc.files.length} item)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Item yang akan dipindahkan ({filesToMove.length} item):
              </span>
              <span className="text-muted-foreground">{activeAccount?.accountEmail}</span>
            </div>
            <div className="max-h-32 overflow-y-auto rounded-md border p-2 text-xs space-y-1">
              {filesToMove.map((file) => (
                <div key={file.id} className="truncate">
                  {file.name}
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
                <span>Memindahkan {filesToMove.length} item...</span>
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
            disabled={mutation.isPending || filesToMove.length === 0 || foldersLoading}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Memindahkan...' : `Pindahkan (${filesToMove.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
