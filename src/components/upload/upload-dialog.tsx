'use client';

import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Upload } from 'lucide-react';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UploadDropzone } from '@/components/upload/upload-dropzone';
import { api } from '@/lib/api-client';
import { formatBytes } from '@/lib/format';
import { selectAccount } from '@/lib/upload/select-account';
import { globalUploadQueue } from '@/lib/upload/upload-queue';
import type { StorageResponse } from '@/types';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentFolderId?: string;
}

export function UploadDialog({ open, onOpenChange, parentFolderId }: UploadDialogProps) {
  const [destinationMode, setDestinationMode] = useState<'auto' | 'manual'>('auto');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['storage'],
    queryFn: () => api.get<StorageResponse>('/api/storage'),
    enabled: open,
  });
  const accounts = useMemo(() => data?.accounts ?? [], [data]);
  const connected = useMemo(() => accounts.filter((a) => a.status === 'connected'), [accounts]);
  const storedValid =
    accountId != null && connected.some((a) => a.id === accountId && a.isUploadEnabled);
  const activeAccountId = storedValid
    ? accountId
    : (connected.find((a) => a.isUploadEnabled)?.id ?? connected[0]?.id ?? null);
  const selectedAccount = accounts.find((a) => a.id === activeAccountId) ?? null;

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const manualDisabled = selectedAccount && !selectedAccount.isUploadEnabled;
  const manualTooLarge = files.find(
    (f) => selectedAccount?.freeBytes != null && f.size > selectedAccount.freeBytes,
  );
  const manualQuotaError = manualDisabled
    ? `Upload dinonaktifkan untuk akun ${selectedAccount.email}. Aktifkan upload pada menu Accounts.`
    : manualTooLarge && selectedAccount
      ? `File ${manualTooLarge.name} (${formatBytes(manualTooLarge.size)}) melebihi sisa ruang ${selectedAccount.email} (${formatBytes(selectedAccount.freeBytes)}).`
      : null;

  const allConnectedDisabled = connected.length > 0 && connected.every((a) => !a.isUploadEnabled);
  const autoUnfitFile =
    destinationMode === 'auto' && files.length > 0
      ? files.find((f) => !selectAccount(f.size, connected))
      : null;
  const autoQuotaError =
    destinationMode === 'auto' && files.length > 0 && connected.length === 0
      ? 'Belum ada akun terhubung dengan ruang penyimpanan.'
      : destinationMode === 'auto' && files.length > 0 && allConnectedDisabled
        ? 'Semua akun dinonaktifkan untuk upload. Silakan aktifkan minimal satu akun di menu Accounts.'
        : autoUnfitFile
          ? `QUOTA_EXCEEDED: Tidak ada akun dengan ruang cukup untuk file ${autoUnfitFile.name} (${formatBytes(autoUnfitFile.size)}).`
          : null;

  const quotaError = destinationMode === 'auto' ? autoQuotaError : manualQuotaError;

  const canUpload = Boolean(
    files.length > 0 &&
    !quotaError &&
    (destinationMode === 'auto'
      ? connected.some((a) => a.isUploadEnabled)
      : selectedAccount && selectedAccount.isUploadEnabled),
  );

  function reset() {
    setFiles([]);
    setDestinationMode('auto');
    setShowAdvanced(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleUpload() {
    if (!canUpload) return;

    globalUploadQueue.addFiles(files, {
      mode: destinationMode,
      accountId: destinationMode === 'manual' ? selectedAccount?.id : undefined,
      folderId: parentFolderId,
    });

    toast.info(`${files.length} file ditambahkan ke antrean upload.`);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload file</DialogTitle>
          <DialogDescription>
            File akan diunggah ke shared drive secara otomatis ke akun yang memiliki ruang cukup.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <UploadDropzone
            onFilesSelected={(newFiles) => {
              setFiles((prev) => [...prev, ...newFiles]);
            }}
            selectedCount={files.length}
            totalSizeBytes={totalSize}
            parentFolderId={parentFolderId}
          />

          {files.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {files.length} file dipilih ({formatBytes(totalSize)})
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => setFiles([])}
              >
                Hapus semua
              </Button>
            </div>
          )}

          {destinationMode === 'auto' && (
            <>
              {connected.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada akun terhubung. Tambahkan akun Google terlebih dahulu.
                </p>
              ) : files.length === 0 ? (
                <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                  Pilih file untuk melihat pemilihan akun otomatis.
                </div>
              ) : (
                <div className="max-h-56 space-y-3 overflow-y-auto">
                  {files.map((file, idx) => {
                    const picked = selectAccount(file.size, connected);
                    return (
                      <div
                        key={idx}
                        className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <p className="truncate font-medium text-foreground">
                            File: {file.name} ({formatBytes(file.size)})
                          </p>
                          <button
                            type="button"
                            onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                            className="ml-2 shrink-0 text-xs text-muted-foreground hover:text-destructive"
                          >
                            Hapus
                          </button>
                        </div>
                        <div className="space-y-1">
                          {connected.map((account) => {
                            const isEligible =
                              account.isUploadEnabled &&
                              account.freeBytes != null &&
                              account.freeBytes >= file.size;
                            return (
                              <div
                                key={account.id}
                                className="flex items-center justify-between text-xs text-muted-foreground"
                              >
                                <span>
                                  {account.email} — Free: {formatBytes(account.freeBytes)}
                                  {!account.isUploadEnabled && (
                                    <span className="ml-1 font-normal text-amber-500">
                                      (Upload dinonaktifkan)
                                    </span>
                                  )}
                                </span>
                                <span className="font-semibold">{isEligible ? '✅' : '❌'}</span>
                              </div>
                            );
                          })}
                        </div>
                        {picked ? (
                          <p className="border-t border-border/50 pt-1.5 text-xs font-medium text-emerald-500">
                            → Upload ke {picked.email}
                          </p>
                        ) : (
                          <p className="border-t border-border/50 pt-1.5 text-xs font-medium text-destructive">
                            {allConnectedDisabled
                              ? 'Semua akun dinonaktifkan untuk upload.'
                              : 'Tidak ada akun dengan ruang cukup untuk file ini.'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Advanced toggle for manual specific account */}
          <div className="pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAdvanced((prev) => {
                  const next = !prev;
                  if (!next) setDestinationMode('auto');
                  return next;
                });
              }}
              className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal className="size-3.5" />
              <span>
                {showAdvanced ? 'Sembunyikan opsi lanjutan' : 'Opsi lanjutan (pilih akun manual)'}
              </span>
            </Button>

            {showAdvanced && (
              <div className="mt-2 space-y-3 rounded-lg border bg-muted/20 p-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium">Tujuan upload:</p>
                  <RadioGroup
                    value={destinationMode}
                    onValueChange={(val) => setDestinationMode(val as 'auto' | 'manual')}
                    className="grid grid-cols-2 gap-2"
                  >
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs transition-colors',
                        destinationMode === 'auto'
                          ? 'border-primary bg-primary/5 font-medium'
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      <RadioGroupItem value="auto" />
                      <span>Automatic</span>
                    </label>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs transition-colors',
                        destinationMode === 'manual'
                          ? 'border-primary bg-primary/5 font-medium'
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      <RadioGroupItem value="manual" />
                      <span>Specific account</span>
                    </label>
                  </RadioGroup>
                </div>

                {destinationMode === 'manual' && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Pilih akun Google:</p>
                    {connected.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Belum ada akun terhubung.</p>
                    ) : (
                      <RadioGroup
                        value={activeAccountId ?? ''}
                        onValueChange={(value) => setAccountId(String(value))}
                        className="gap-2"
                      >
                        {accounts.map((account) => {
                          const disabled =
                            account.status !== 'connected' || !account.isUploadEnabled;
                          const active = activeAccountId === account.id;
                          const insufficient =
                            files.length > 0 &&
                            account.freeBytes != null &&
                            totalSize > account.freeBytes;
                          const remaining =
                            files.length > 0 && account.freeBytes != null
                              ? Math.max(account.freeBytes - totalSize, 0)
                              : account.freeBytes;
                          return (
                            <label
                              key={account.id}
                              className={cn(
                                'flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 transition-colors',
                                active
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:bg-muted/50',
                                disabled && 'pointer-events-none opacity-50',
                              )}
                            >
                              <RadioGroupItem
                                value={account.id}
                                disabled={disabled}
                                className="mt-0.5"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-medium">
                                  {account.email}
                                  {!account.isUploadEnabled && (
                                    <span className="ml-1.5 font-normal text-amber-500">
                                      (Upload dinonaktifkan)
                                    </span>
                                  )}
                                </span>
                                <span className="block text-[11px] text-muted-foreground">
                                  Free {formatBytes(account.freeBytes)}
                                  {files.length > 0 ? ` → sisa ${formatBytes(remaining)}` : ''}
                                </span>
                              </span>
                              {insufficient && (
                                <span className="text-[11px] font-medium text-destructive">
                                  Kurang
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </RadioGroup>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {quotaError && <p className="text-sm font-medium text-destructive">{quotaError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={!canUpload} onClick={handleUpload}>
            <Upload className="mr-1.5 size-4" />
            Upload {files.length > 0 ? `(${files.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadButtonInner({ parentFolderId }: { parentFolderId?: string }) {
  const searchParams = useSearchParams();
  const resolvedParentFolderId = parentFolderId ?? searchParams?.get('folderId') ?? undefined;
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload />
        Upload
      </Button>
      <UploadDialog open={open} onOpenChange={setOpen} parentFolderId={resolvedParentFolderId} />
    </>
  );
}

export function UploadButton(props: { parentFolderId?: string }) {
  return (
    <Suspense
      fallback={
        <Button disabled>
          <Upload />
          Upload
        </Button>
      }
    >
      <UploadButtonInner {...props} />
    </Suspense>
  );
}
