export type FileKind = 'document' | 'image' | 'video' | 'archive' | 'other' | 'folder';

export function classifyMime(mimeType: string): FileKind {
  if (mimeType === 'application/vnd.google-apps.folder') return 'folder';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (
    mimeType.includes('zip') ||
    mimeType.includes('rar') ||
    mimeType.includes('tar') ||
    mimeType.includes('7z') ||
    mimeType.includes('gzip') ||
    mimeType.includes('compress')
  )
    return 'archive';
  if (
    mimeType.startsWith('application/vnd.google-apps.') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('text/') ||
    mimeType.includes('word') ||
    mimeType.includes('sheet') ||
    mimeType.includes('presentation') ||
    mimeType.includes('officedocument')
  )
    return 'document';
  return 'other';
}

export const FILE_KINDS: FileKind[] = ['document', 'image', 'video', 'archive', 'other'];
