'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderPlus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api-client';
import type { StorageResponse } from '@/types';

export function NewFolderButton() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { data } = useQuery({
    queryKey: ['storage'],
    queryFn: () => api.get<StorageResponse>('/api/storage'),
    enabled: open,
  });
  const connected = useMemo(
    () => (data?.accounts ?? []).filter((a) => a.status === 'connected'),
    [data],
  );
  const storedValid = accountId != null && connected.some((a) => a.id === accountId);
  const activeAccountId = storedValid ? accountId : (connected[0]?.id ?? null);

  const nameError = submitted && !name.trim() ? 'Nama folder wajib diisi.' : null;

  const createMutation = useMutation({
    mutationFn: (input: { name: string; accountId: string }) =>
      api.post<{ folder: { id: string; name: string } }>('/api/folders', input),
    onSuccess: ({ folder }) => {
      toast.success(`Folder ${folder.name} dibuat.`);
      queryClient.invalidateQueries({ queryKey: ['files'] });
      handleClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleClose() {
    setOpen(false);
    setName('');
    setAccountId(null);
    setSubmitted(false);
    createMutation.reset();
  }

  function handleSubmit() {
    setSubmitted(true);
    if (!name.trim() || !activeAccountId) return;
    createMutation.mutate({ name: name.trim(), accountId: activeAccountId });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FolderPlus />
        New Folder
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) handleClose();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat folder baru</DialogTitle>
            <DialogDescription>Folder dibuat di akun Google Drive yang dipilih.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-folder-name">Nama folder</Label>
              <Input
                id="new-folder-name"
                value={name}
                placeholder="Mis. Documents"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
              />
              {nameError && <p className="text-sm font-medium text-destructive">{nameError}</p>}
            </div>

            <div className="space-y-2">
              <Label>Akun tujuan</Label>
              {connected.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada akun terhubung. Tambahkan akun Google terlebih dahulu.
                </p>
              ) : (
                <Select
                  value={activeAccountId ?? ''}
                  onValueChange={(value) => setAccountId(String(value))}
                  items={Object.fromEntries(connected.map((a) => [a.id, a.email]))}
                >
                  <SelectTrigger className="w-full" aria-label="Akun tujuan folder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {connected.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Batal
            </Button>
            <Button
              disabled={connected.length === 0 || createMutation.isPending}
              onClick={handleSubmit}
            >
              {createMutation.isPending ? 'Membuat...' : 'Buat Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
