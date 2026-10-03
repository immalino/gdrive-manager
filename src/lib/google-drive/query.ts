import type { FileKind } from '@/lib/files/mime';

export interface DriveFileFilters {
  folderId?: string;
  search?: string;
  kind?: FileKind;
  sizeMin?: number;
  sizeMax?: number;
  modifiedAfter?: string;
  modifiedBefore?: string;
}

function escapeQuote(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const KIND_SQL: Partial<Record<FileKind, string>> = {
  document:
    "((mimeType contains 'application/vnd.google-apps.' and mimeType != 'application/vnd.google-apps.folder') or mimeType = 'application/pdf' or mimeType contains 'text/' or mimeType contains 'officedocument' or mimeType contains 'word' or mimeType contains 'sheet' or mimeType contains 'presentation')",
  image: "mimeType contains 'image/'",
  video: "mimeType contains 'video/'",
  archive:
    "(mimeType contains 'zip' or mimeType contains 'rar' or mimeType contains 'tar' or mimeType contains '7z' or mimeType contains 'gzip' or mimeType contains 'compress')",
};

export function buildDriveQuery(filters: DriveFileFilters): string {
  const parts = ['trashed = false'];
  if (filters.folderId?.trim()) parts.push(`'${escapeQuote(filters.folderId.trim())}' in parents`);
  if (filters.search?.trim()) parts.push(`name contains '${escapeQuote(filters.search.trim())}'`);
  const kindSql = filters.kind ? KIND_SQL[filters.kind] : undefined;
  if (kindSql) parts.push(kindSql);
  if (filters.sizeMin != null) parts.push(`size > ${Math.floor(filters.sizeMin)}`);
  if (filters.sizeMax != null) parts.push(`size < ${Math.floor(filters.sizeMax)}`);
  if (filters.modifiedAfter)
    parts.push(`modifiedTime > '${new Date(filters.modifiedAfter).toISOString()}'`);
  if (filters.modifiedBefore)
    parts.push(`modifiedTime < '${new Date(filters.modifiedBefore).toISOString()}'`);
  return parts.join(' and ');
}
