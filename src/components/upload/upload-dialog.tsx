'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { api } from '@/lib/api-client';
import { formatBytes } from '@/lib/format';
import type { StorageResponse } from '@/types';

class UploadError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryAfterSec?: number,
  ) {
    super(message);
  }
}

interface UploadHandle {
  promise: Promise<unknown>;
  xhr: XMLHttpRequest;
}

function startUpload(url: string, file: File, onProgress: (pct: number) => void): UploadHandle {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<unknown>((resolve, reject) => {
    xhr.open('POST', url);
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      type ErrorBody = { error?: { code?: string; message?: string } };
      let body: ErrorBody | null = null;
      try {
        body = xhr.responseText ? (JSON.parse(xhr.responseText) as ErrorBody) : null;
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
        return;
      }
      const retryAfter = Number(xhr.getResponseHeader('retry-after') ?? '');
      reject(
        new UploadError(
          body?.error?.code ?? `HTTP_${xhr.status}`,
          body?.error?.message ?? `HTTP ${xhr.status}`,
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
        ),
      );
    };
    xhr.onerror = () => reject(new UploadError('NETWORK', 'Koneksi gagal saat upload.'));
    xhr.onabort = () => reject(new UploadError('ABORTED', 'Upload dibatalkan.'));
    xhr.send(file);
  });
  return { promise, xhr };
}

function describeUploadError(error: UploadError): string {
  if (error.code === 'RATE_LIMITED') {
    const wait =
      error.retryAfterSec != null ? ` Coba lagi dalam ${error.retryAfterSec} detik.` : '';
    return `${error.message}${wait}`;
  }
  return error.message;
}

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [error, setError] = useState<UploadError | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data } = useQuery({
    queryKey: ['storage'],
    queryFn: () => api.get<StorageResponse>('/api/storage'),
    enabled: open,
  });
  const accounts = useMemo(() => data?.accounts ?? [], [data]);
  const connected = useMemo(() => accounts.filter((a) => a.status === 'connected'), [accounts]);
  const storedValid = accountId != null && connected.some((a) => a.id === accountId);
  const activeAccountId = storedValid ? accountId : (connected[0]?.id ?? null);
  const selectedAccount = accounts.find((a) => a.id === activeAccountId) ?? null;

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const tooLarge = files.find(
    (f) => selectedAccount?.freeBytes != null && f.size > selectedAccount.freeBytes,
  );
  const quotaError =
    tooLarge && selectedAccount
      ? `File ${tooLarge.name} (${formatBytes(tooLarge.size)}) melebihi sisa ruang ${selectedAccount.email} (${formatBytes(selectedAccount.freeBytes)}).`
      : null;

  const isUploading = progress !== null;
  const canUpload = Boolean(files.length > 0 && selectedAccount && !quotaError && !isUploading);
  const currentFile = currentIndex != null ? (files[currentIndex] ?? null) : null;

  function reset() {
    xhrRef.current?.abort();
    xhrRef.current = null;
    setFiles([]);
    setProgress(null);
    setCurrentIndex(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleUpload() {
    if (files.length === 0 || !selectedAccount || quotaError || isUploading) return;
    setError(null);
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      setCurrentIndex(i);
      setProgress(0);
      const url = `/api/files/upload?accountId=${encodeURIComponent(selectedAccount.id)}&filename=${encodeURIComponent(file.name)}`;
      const { promise, xhr } = startUpload(url, file, setProgress);
      xhrRef.current = xhr;
      try {
        await promise;
      } catch (err) {
        const uploadError =
          err instanceof UploadError
            ? err
            : new UploadError(
                'UPLOAD_FAILED',
                err instanceof Error ? err.message : 'Upload gagal.',
              );
        setProgress(null);
        setCurrentIndex(null);
        // File yang sudah terkirim keluar dari daftar; sisa file bisa diulang.
        setFiles(files.slice(i + 1));
        if (uploadError.code !== 'ABORTED') setError(uploadError);
        return;
      } finally {
        xhrRef.current = null;
      }
    }
    const message =
      files.length === 1
        ? `File ${files[0]!.name} diupload ke ${selectedAccount.email}.`
        : `${files.length} file diupload ke ${selectedAccount.email}.`;
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: ['files'] });
    queryClient.invalidateQueries({ queryKey: ['storage'] });
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload file</DialogTitle>
          <DialogDescription>
            Pilih file dan akun tujuan (Mode A — manual). Banyak file dikirim berurutan, satu
            request per file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-dashed p-4 text-center">
            <input
              ref={inputRef}
              id="upload-file-input"
              type="file"
              multiple
              className="sr-only"
              disabled={isUploading}
              onChange={(e) => {
                setFiles(Array.from(e.target.files ?? []));
                setError(null);
                setProgress(null);
              }}
            />
            <label
              htmlFor="upload-file-input"
              className="block cursor-pointer text-sm font-medium hover:text-foreground"
            >
              {files.length === 0
                ? 'Klik untuk memilih file'
                : files.length === 1
                  ? files[0]!.name
                  : `${files.length} file terpilih`}
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              {files.length > 0 ? `${formatBytes(totalSize)} total` : 'Satu request per file'}
            </p>
          </div>

          {connected.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada akun terhubung. Tambahkan akun Google terlebih dahulu.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Upload to:</p>
              <RadioGroup
                value={activeAccountId ?? ''}
                onValueChange={(value) => setAccountId(String(value))}
                className="gap-2"
              >
                {accounts.map((account) => {
                  const disabled = account.status !== 'connected';
                  const active = activeAccountId === account.id;
                  const insufficient =
                    files.length > 0 && account.freeBytes != null && totalSize > account.freeBytes;
                  const remaining =
                    files.length > 0 && account.freeBytes != null
                      ? Math.max(account.freeBytes - totalSize, 0)
                      : account.freeBytes;
                  return (
                    <label
                      key={account.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                        disabled && 'pointer-events-none opacity-50',
                      )}
                    >
                      <RadioGroupItem value={account.id} disabled={disabled} className="mt-0.5" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{account.email}</span>
                        <span className="block text-xs text-muted-foreground">
                          Free {formatBytes(account.freeBytes)}
                          {files.length > 0 ? ` → sisa ${formatBytes(remaining)}` : ''}
                        </span>
                      </span>
                      {insufficient && (
                        <span className="text-xs font-medium text-destructive">Kurang</span>
                      )}
                    </label>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {quotaError && <p className="text-sm font-medium text-destructive">{quotaError}</p>}

          {error && (
            <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <p>{describeUploadError(error)}</p>
                {error.code === 'ACCOUNT_DISCONNECTED' && (
                  <a className="underline underline-offset-2" href="/api/google/connect">
                    Hubungkan ulang akun
                  </a>
                )}
              </div>
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate">
                  Mengupload file {currentIndex != null ? currentIndex + 1 : 1}/{files.length} —{' '}
                  {currentFile?.name} ke {selectedAccount?.email}
                </span>
                <span className="shrink-0">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {!isUploading && files.length > 10 && (
            <p className="text-xs text-muted-foreground">
              Batas 10 upload/menit. Jika terkena batas, file yang tersisa bisa dikirim ulang lewat
              tombol Upload setelah jeda 1 menit.
            </p>
          )}
        </div>

        <DialogFooter>
          {isUploading ? (
            <Button variant="outline" onClick={() => xhrRef.current?.abort()}>
              Batal
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Batal
              </Button>
              <Button disabled={!canUpload} onClick={() => void handleUpload()}>
                <Upload />
                Upload
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UploadButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload />
        Upload
      </Button>
      <UploadDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
