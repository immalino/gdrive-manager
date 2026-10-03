'use client';

import { ArrowLeft, ChevronRight, Folder, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from 'cn';
import type { BreadcrumbItem } from '@/types';

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  onNavigate: (folderId: string) => void;
  rootFolderId?: string;
  className?: string;
}

export function Breadcrumb({ items, onNavigate, rootFolderId, className }: BreadcrumbProps) {
  const breadcrumbItems =
    items && items.length > 0 ? items : [{ id: rootFolderId || 'root', name: 'My Drive' }];

  const canGoBack = breadcrumbItems.length > 1;
  const parentFolder = canGoBack ? breadcrumbItems[breadcrumbItems.length - 2] : null;

  return (
    <nav
      aria-label="Folder breadcrumb"
      className={cn('flex items-center gap-1.5 text-sm overflow-x-auto py-1', className)}
    >
      {canGoBack && parentFolder && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => onNavigate(parentFolder.id)}
          title={`Kembali ke ${parentFolder.name}`}
          aria-label={`Kembali ke ${parentFolder.name}`}
        >
          <ArrowLeft className="size-4" />
        </Button>
      )}

      <div className="flex items-center gap-1.5 min-w-0">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const isRoot = index === 0;

          return (
            <div key={item.id || index} className="flex items-center gap-1.5 shrink-0">
              {index > 0 && (
                <ChevronRight
                  className="size-4 text-muted-foreground/60 shrink-0"
                  aria-hidden="true"
                />
              )}
              {isLast ? (
                <span
                  className="flex items-center gap-1.5 font-semibold text-foreground px-1.5 py-0.5 rounded select-none"
                  aria-current="page"
                >
                  {isRoot ? (
                    <HardDrive className="size-4 text-primary shrink-0" />
                  ) : (
                    <Folder className="size-4 text-amber-500 fill-amber-500/20 shrink-0" />
                  )}
                  <span className="truncate max-w-[200px]">{item.name}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium transition-colors hover:underline px-1.5 py-0.5 rounded"
                >
                  {isRoot ? (
                    <HardDrive className="size-4 text-muted-foreground shrink-0" />
                  ) : (
                    <Folder className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate max-w-[200px]">{item.name}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
