'use client';

import { UploadCloud } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { globalUploadQueue } from '@/lib/upload/upload-queue';

interface FilesDropOverlayProps {
  children: ReactNode;
  activeAccountId?: string;
}

export function FilesDropOverlay({ children, activeAccountId }: FilesDropOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let counter = 0;

    const isFileDrag = (e: DragEvent) => {
      return e.dataTransfer?.types ? Array.from(e.dataTransfer.types).includes('Files') : false;
    };

    const handleDragEnter = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      counter++;
      setIsDragging(true);
    };

    const handleDragOver = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      counter--;
      if (counter <= 0) {
        counter = 0;
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      counter = 0;
      setIsDragging(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files);
        const isManual = Boolean(activeAccountId && activeAccountId !== 'all');
        globalUploadQueue.addFiles(droppedFiles, {
          mode: isManual ? 'manual' : 'auto',
          accountId: isManual ? activeAccountId : undefined,
        });
        toast.info(`${droppedFiles.length} file ditambahkan ke antrean upload.`);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [activeAccountId]);

  return (
    <div className="relative min-h-[calc(100vh-10rem)]">
      {children}

      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center border-4 border-dashed border-primary bg-background/80 backdrop-blur-sm transition-all">
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex size-16 animate-bounce items-center justify-center rounded-full bg-primary/20 text-primary">
              <UploadCloud className="size-8" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                Lepaskan file untuk mulai mengunggah ke Google Drive
              </p>
              <p className="text-sm text-muted-foreground">
                File akan otomatis dimasukkan ke antrean upload latar belakang
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
