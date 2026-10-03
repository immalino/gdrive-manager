'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Copy,
  Download,
  ExternalLink,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api-client';
import type { DriveFileDto } from '@/lib/google-drive/types';
import type { FoldersResponse } from '@/types';

export function driveFileUrl(file: DriveFileDto): string {
  if (file.webViewLink) return file.webViewLink;
  return file.mimeType === 'application/vnd.google-apps.folder'
    ? `https://drive.google.com/drive/folders/${file.id}`
    : `https://drive.google.com/open?id=${file.id}`;
}

export function FileActions({ file }: { file: DriveFileDto }) {
  const queryClient = useQueryClient();
  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState(file.name);

  const [moveOpen, setMoveOpen] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState(file.parentId ?? 'root');

  const [copyOpen, setCopyOpen] = useState(false);
  const [copyName, setCopyName] = useState(file.name);
  const [copyTargetFolderId, setCopyTargetFolderId] = useState(file.parentId ?? 'root');
  const [folderFilter, setFolderFilter] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);

  // Folder query untuk picker Move & Copy
  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders', file.accountId],
    queryFn: () =>
      api.get<FoldersResponse>(`/api/folders?accountId=${encodeURIComponent(file.accountId)}`),
    enabled: moveOpen || copyOpen,
  });

  const availableFolders = useMemo(() => {
    const list = (foldersData?.folders ?? []).filter((f) => f.id !== file.id);
    if (!folderFilter.trim()) return list;
    const q = folderFilter.toLowerCase();
    return list.filter((f) => f.name.toLowerCase().includes(q));
  }, [foldersData, file.id, folderFilter]);

  const folderSelectItems = useMemo(() => {
    const map: Record<string, string> = { root: 'Root (My Drive)' };
    for (const f of foldersData?.folders ?? []) {
      map[f.id] = f.name;
    }
    return map;
  }, [foldersData]);

  // Mutations
  const renameMutation = useMutation({
    mutationFn: (newName: string) => {
      const endpoint = isFolder
        ? `/api/folders/${encodeURIComponent(file.id)}?accountId=${encodeURIComponent(file.accountId)}`
        : `/api/files/${encodeURIComponent(file.id)}?accountId=${encodeURIComponent(file.accountId)}`;
      return api.patch<{ updated: boolean }>(endpoint, { name: newName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success(`${isFolder ? 'Folder' : 'File'} di-rename menjadi "${renameName.trim()}".`);
      setRenameOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const moveMutation = useMutation({
    mutationFn: () => {
      const destId = targetFolderId === 'root' ? null : targetFolderId;
      const currentParent = file.parentId ?? null;
      if (destId === currentParent) {
        return Promise.resolve({ updated: true, noop: true });
      }
      const endpoint = isFolder
        ? `/api/folders/${encodeURIComponent(file.id)}?accountId=${encodeURIComponent(file.accountId)}`
        : `/api/files/${encodeURIComponent(file.id)}?accountId=${encodeURIComponent(file.accountId)}`;
      return api.patch<{ updated: boolean; noop?: boolean }>(endpoint, {
        folderId: destId,
        fromFolderId: currentParent,
      });
    },
    onSuccess: (res) => {
      if (res.noop) {
        toast.info(
          `${isFolder ? 'Folder' : 'File'} sudah berada di folder ${folderSelectItems[targetFolderId] || 'ini'}.`,
        );
      } else {
        queryClient.invalidateQueries({ queryKey: ['files'] });
        toast.success(
          `${isFolder ? 'Folder' : 'File'} berhasil dipindahkan ke ${folderSelectItems[targetFolderId] || 'folder tujuan'}.`,
        );
      }
      setMoveOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copyMutation = useMutation({
    mutationFn: () => {
      const destId = copyTargetFolderId === 'root' ? undefined : copyTargetFolderId;
      return api.post<{ file: DriveFileDto }>(
        `/api/files/${encodeURIComponent(file.id)}/copy?accountId=${encodeURIComponent(file.accountId)}`,
        { name: copyName.trim(), folderId: destId },
      );
    },
    onSuccess: ({ file: copied }) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
      toast.success(`File disalin sebagai "${copied.name}".`);
      setCopyOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      const endpoint = isFolder
        ? `/api/folders/${encodeURIComponent(file.id)}?accountId=${encodeURIComponent(file.accountId)}`
        : `/api/files/${encodeURIComponent(file.id)}?accountId=${encodeURIComponent(file.accountId)}`;
      return api.delete<{ deleted: boolean }>(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
      toast.success(`${isFolder ? 'Folder' : 'File'} ${file.name} dihapus.`);
      setDeleteOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const downloadHref = `/api/files/${encodeURIComponent(file.id)}/download?accountId=${encodeURIComponent(file.accountId)}`;

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Quick Actions */}
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

      {!isFolder && (
        <Button
          variant="ghost"
          size="icon-sm"
          render={<a href={downloadHref} download aria-label={`Download ${file.name}`} />}
        >
          <Download />
        </Button>
      )}

      {/* Row Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`Aksi lainnya untuk ${file.name}`}>
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setRenameName(file.name);
              setRenameOpen(true);
            }}
          >
            <Pencil />
            <span>Rename</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setTargetFolderId(file.parentId ?? 'root');
              setMoveOpen(true);
            }}
          >
            <FolderInput />
            <span>Move</span>
          </DropdownMenuItem>

          {!isFolder && (
            <DropdownMenuItem
              onClick={() => {
                setCopyName(file.name);
                setCopyTargetFolderId(file.parentId ?? 'root');
                setCopyOpen(true);
              }}
            >
              <Copy />
              <span>Copy</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            render={<a href={driveFileUrl(file)} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLink />
            <span>Open in Google Drive</span>
          </DropdownMenuItem>

          {!isFolder && (
            <DropdownMenuItem render={<a href={downloadHref} download />}>
              <Download />
              <span>Download</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {isFolder ? 'Folder' : 'File'}</DialogTitle>
            <DialogDescription>
              Masukkan nama baru untuk {isFolder ? 'folder' : 'file'} ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor={`rename-${file.id}`}>Nama</Label>
              <Input
                id={`rename-${file.id}`}
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && renameName.trim() && !renameMutation.isPending) {
                    renameMutation.mutate(renameName.trim());
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!renameName.trim() || renameMutation.isPending}
              onClick={() => renameMutation.mutate(renameName.trim())}
            >
              {renameMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog
        open={moveOpen}
        onOpenChange={(next) => {
          setMoveOpen(next);
          if (!next) setFolderFilter('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move {isFolder ? 'Folder' : 'File'}</DialogTitle>
            <DialogDescription>Pilih folder tujuan di akun {file.accountEmail}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Folder Tujuan</Label>
              {foldersLoading ? (
                <p className="text-sm text-muted-foreground">Memuat daftar folder...</p>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Filter nama folder..."
                    value={folderFilter}
                    onChange={(e) => setFolderFilter(e.target.value)}
                  />
                  <Select
                    value={targetFolderId}
                    onValueChange={(val) => setTargetFolderId(String(val))}
                    items={folderSelectItems}
                  >
                    <SelectTrigger className="w-full" aria-label="Pilih folder tujuan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMoveOpen(false);
                setFolderFilter('');
              }}
            >
              Batal
            </Button>
            <Button
              disabled={foldersLoading || moveMutation.isPending}
              onClick={() => moveMutation.mutate()}
            >
              {moveMutation.isPending ? 'Memindahkan...' : 'Pindahkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Dialog (File only) */}
      {!isFolder && (
        <Dialog
          open={copyOpen}
          onOpenChange={(next) => {
            setCopyOpen(next);
            if (!next) setFolderFilter('');
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Copy File</DialogTitle>
              <DialogDescription>
                Buat salinan file ini di akun {file.accountEmail}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor={`copy-name-${file.id}`}>Nama File Salinan</Label>
                <Input
                  id={`copy-name-${file.id}`}
                  value={copyName}
                  onChange={(e) => setCopyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && copyName.trim() && !copyMutation.isPending) {
                      copyMutation.mutate();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Folder Tujuan</Label>
                {foldersLoading ? (
                  <p className="text-sm text-muted-foreground">Memuat daftar folder...</p>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Filter nama folder tujuan..."
                      value={folderFilter}
                      onChange={(e) => setFolderFilter(e.target.value)}
                    />
                    <Select
                      value={copyTargetFolderId}
                      onValueChange={(val) => setCopyTargetFolderId(String(val))}
                      items={folderSelectItems}
                    >
                      <SelectTrigger className="w-full" aria-label="Pilih folder tujuan salinan">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
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
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCopyOpen(false);
                  setFolderFilter('');
                }}
              >
                Batal
              </Button>
              <Button
                disabled={!copyName.trim() || foldersLoading || copyMutation.isPending}
                onClick={() => copyMutation.mutate()}
              >
                {copyMutation.isPending ? 'Menyalin...' : 'Salin File'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isFolder ? 'Hapus folder ini?' : 'Hapus file ini?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isFolder
                ? `Folder "${file.name}" beserta seluruh isinya akan dihapus permanen dari Google Drive ${file.accountEmail}. Tindakan ini tidak bisa dibatalkan.`
                : `"${file.name}" akan dihapus permanen dari Google Drive ${file.accountEmail}. Tindakan ini tidak bisa dibatalkan.`}
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
