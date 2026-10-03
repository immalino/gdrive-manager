import type { DriveFileDto } from '@/lib/google-drive/types';

export type SortKey = 'name' | 'size' | 'modified';

export function sortFiles(
  files: DriveFileDto[],
  key: SortKey,
  dir: 'asc' | 'desc',
): DriveFileDto[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...files].sort((a, b) => {
    if (key === 'name') return sign * a.name.localeCompare(b.name, 'id');
    if (key === 'size') return sign * ((a.sizeBytes ?? -1) - (b.sizeBytes ?? -1));
    return (
      sign *
      ((a.modifiedAt ? Date.parse(a.modifiedAt) : 0) -
        (b.modifiedAt ? Date.parse(b.modifiedAt) : 0))
    );
  });
}
