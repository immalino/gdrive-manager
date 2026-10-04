'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderPlus } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';

export interface NewFolderDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  parentFolderId?: string;
}

export function NewFolderDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  parentFolderId,
}: NewFolderDialogProps) {
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };

  const nameError = submitted && !name.trim() ? 'Nama folder wajib diisi.' : null;

  const createMutation = useMutation({
    mutationFn: (input: { name: string; parentFolderId?: string }) =>
      api.post<{ folder: { id: string; name: string } }>('/api/folders', input),
    onSuccess: ({ folder }) => {
      toast.success(`Folder ${folder.name} dibuat.`);
      queryClient.invalidateQueries({ queryKey: ['files'] });
      handleClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleClose() {
    setName('');
    setSubmitted(false);
    createMutation.reset();
    setOpen(false);
  }

  function handleSubmit() {
    setSubmitted(true);
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), parentFolderId });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else setOpen(true);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat folder baru</DialogTitle>
          <DialogDescription>Folder dibuat di shared drive oleh akun utama.</DialogDescription>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Batal
          </Button>
          <Button disabled={createMutation.isPending} onClick={handleSubmit}>
            {createMutation.isPending ? 'Membuat...' : 'Buat Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewFolderButton({ parentFolderId }: { parentFolderId?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FolderPlus />
        New Folder
      </Button>
      <NewFolderDialog open={open} onOpenChange={setOpen} parentFolderId={parentFolderId} />
    </>
  );
}
