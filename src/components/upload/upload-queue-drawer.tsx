'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Minus,
  RotateCw,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/lib/format';
import { globalUploadQueue, type QueueItem, uploadFileChunked } from '@/lib/upload/upload-queue';

export function UploadQueueDrawer() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Register uploader that invalidates queries on completion
    globalUploadQueue.setUploader(async (item, onProgress) => {
      await uploadFileChunked(item, onProgress);
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    });

    const unsubscribe = globalUploadQueue.subscribe((updatedItems) => {
      setItems([...updatedItems]);
    });
    return unsubscribe;
  }, [queryClient]);

  if (items.length === 0) {
    return null;
  }

  const activeCount = items.filter((i) => i.status === 'uploading').length;
  const queuedCount = items.filter((i) => i.status === 'queued').length;
  const completedCount = items.filter((i) => i.status === 'completed').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;
  const isAllDone = activeCount === 0 && queuedCount === 0;

  const headerTitle = !isAllDone
    ? `Mengunggah ${completedCount} dari ${items.length} file`
    : failedCount > 0
      ? `${failedCount} file gagal diunggah (${completedCount} selesai)`
      : `${completedCount} file selesai diunggah`;

  const handleClose = () => {
    if (isAllDone) {
      globalUploadQueue.clearFinished();
      if (failedCount > 0) {
        items.forEach((item) => {
          if (item.status === 'failed') globalUploadQueue.cancelItem(item.id);
        });
        globalUploadQueue.clearFinished();
      }
    } else {
      // Cancel remaining items and clear
      items.forEach((item) => globalUploadQueue.cancelItem(item.id));
      globalUploadQueue.clearFinished();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 md:w-96 overflow-hidden rounded-xl border bg-background/95 shadow-2xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/40 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {!isAllDone ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
          ) : failedCount > 0 ? (
            <AlertCircle className="size-4 shrink-0 text-destructive" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
          )}
          <span className="truncate text-xs font-semibold text-foreground">{headerTitle}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMinimized((prev) => !prev)}
            title={isMinimized ? 'Perbesar antrean' : 'Perkecil antrean'}
          >
            {isMinimized ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={handleClose}
            title={isAllDone ? 'Tutup dan bersihkan' : 'Batalkan semua dan tutup'}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <>
          <div className="max-h-72 space-y-2 divide-y divide-border/40 overflow-y-auto p-2">
            {items.map((item) => (
              <div key={item.id} className="pt-2 first:pt-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <div className="mt-0.5 shrink-0">
                      {item.status === 'uploading' && (
                        <Loader2 className="size-3.5 animate-spin text-primary" />
                      )}
                      {item.status === 'completed' && (
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                      )}
                      {item.status === 'failed' && (
                        <AlertCircle className="size-3.5 text-destructive" />
                      )}
                      {item.status === 'queued' && (
                        <Clock className="size-3.5 text-muted-foreground" />
                      )}
                      {item.status === 'cancelled' && (
                        <Minus className="size-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-xs font-medium text-foreground"
                        title={item.file.name}
                      >
                        {item.file.name}
                      </p>
                      <p
                        className={`truncate text-[11px] ${item.status === 'failed' ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
                        title={item.error}
                      >
                        {formatBytes(item.file.size)}
                        {item.status === 'uploading' && ` • ${item.progress}%`}
                        {item.status === 'queued' && ' • Menunggu antrean'}
                        {item.status === 'completed' && ' • Selesai'}
                        {item.status === 'cancelled' && ' • Dibatalkan'}
                        {item.status === 'failed' && ` • ${item.error || 'Gagal'}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center">
                    {(item.status === 'uploading' || item.status === 'queued') && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 text-muted-foreground hover:text-destructive"
                        onClick={() => globalUploadQueue.cancelItem(item.id)}
                        title="Batalkan"
                      >
                        <X className="size-3" />
                      </Button>
                    )}
                    {(item.status === 'failed' || item.status === 'cancelled') && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 text-muted-foreground hover:text-foreground"
                        onClick={() => globalUploadQueue.retryItem(item.id)}
                        title={item.error ? `Coba lagi: ${item.error}` : 'Coba lagi'}
                      >
                        <RotateCw className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {item.status === 'uploading' && (
                  <div className="mt-1.5 px-0.5">
                    <Progress value={item.progress} className="h-1" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-1.5 border-t bg-muted/20 p-2">
            {failedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => globalUploadQueue.retryAllFailed()}
              >
                <RotateCw className="mr-1.5 size-3" />
                Ulangi Semua yang Gagal ({failedCount})
              </Button>
            )}
            {isAllDone && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => globalUploadQueue.clearFinished()}
              >
                Bersihkan Daftar Selesai
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
