'use client';

import { UploadCloud } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { cn } from 'cn';
import { formatBytes } from '@/lib/format';

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  selectedCount?: number;
  totalSizeBytes?: number;
}

export function UploadDropzone({
  onFilesSelected,
  disabled = false,
  className,
  selectedCount = 0,
  totalSizeBytes,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounter.current = 0;
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onFilesSelected(droppedFiles);
      e.dataTransfer.clearData();
    }
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      onFilesSelected(selected);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        isDragging
          ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
          : 'border-muted-foreground/25 hover:border-primary/60 bg-muted/20 hover:bg-muted/30',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={handleInputChange}
      />
      <div className="flex flex-col items-center justify-center gap-2">
        <div
          className={cn(
            'flex size-12 items-center justify-center rounded-full transition-colors',
            isDragging ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          <UploadCloud className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {selectedCount > 0
              ? `${selectedCount} file terpilih`
              : 'Tarik & lepas file di sini atau klik untuk memilih file'}
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedCount > 0 && totalSizeBytes != null
              ? `Total: ${formatBytes(totalSizeBytes)}`
              : 'Mendukung multi-file upload • Satu file per request dengan antrean'}
          </p>
        </div>
      </div>
    </div>
  );
}
