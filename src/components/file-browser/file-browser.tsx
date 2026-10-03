'use client';

import { Suspense, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Breadcrumb } from './breadcrumb';
import { FilesTable } from '@/components/files/files-table';
import { FilesDropOverlay } from '@/components/files/files-drop-overlay';
import type { BreadcrumbItem } from '@/types';

export function FileBrowser() {
  return (
    <Suspense fallback={null}>
      <FileBrowserContent />
    </Suspense>
  );
}

function FileBrowserContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const folderId = searchParams.get('folderId') || undefined;
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);

  const handleNavigate = useCallback(
    (targetFolderId: string) => {
      const sp = new URLSearchParams(window.location.search);
      if (!targetFolderId || targetFolderId === 'root') {
        sp.delete('folderId');
      } else {
        sp.set('folderId', targetFolderId);
      }
      const qs = sp.toString();
      router.push(qs ? `/dashboard?${qs}` : '/dashboard');
    },
    [router],
  );

  return (
    <FilesDropOverlay>
      <div className="flex flex-1 flex-col min-h-0 space-y-4">
        <div className="flex flex-col gap-1 shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">My Drive</h1>
          </div>
          <Breadcrumb items={breadcrumb} onNavigate={handleNavigate} />
        </div>
        <FilesTable
          folderId={folderId}
          onNavigateFolder={handleNavigate}
          onBreadcrumbLoaded={setBreadcrumb}
        />
      </div>
    </FilesDropOverlay>
  );
}
