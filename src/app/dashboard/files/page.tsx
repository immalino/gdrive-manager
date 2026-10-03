import { Suspense } from 'react';
import { FilesTable } from '@/components/files/files-table';
import { FILE_KINDS } from '@/lib/files/mime';
import type { SortKey } from '@/lib/files/merge';

interface FilesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const SORT_KEYS: SortKey[] = ['name', 'size', 'modified'];
const KIND_VALUES: string[] = [...FILE_KINDS, 'folder'];

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default async function FilesPage({ searchParams }: FilesPageProps) {
  const sp = await searchParams;
  const kind = first(sp.kind);
  const sort = first(sp.sort);
  const initial = {
    search: first(sp.search),
    accountId: first(sp.accountId),
    kind: KIND_VALUES.includes(kind) ? kind : 'all',
    sort: (SORT_KEYS.includes(sort as SortKey) ? sort : 'modified') as SortKey,
    dir: (first(sp.dir) === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Files</h1>
        <p className="text-sm text-muted-foreground">
          Jelajahi file dari seluruh akun Google Drive.
        </p>
      </div>
      <Suspense fallback={null}>
        <FilesTable initial={initial} />
      </Suspense>
    </div>
  );
}
