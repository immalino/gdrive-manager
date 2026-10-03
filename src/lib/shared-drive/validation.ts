import type { GoogleDriveService } from '@/lib/google-drive/service';

export async function isSubfolderOfSharedRoot(
  service: GoogleDriveService,
  rootFolderId: string,
  folderId?: string | null,
): Promise<boolean> {
  if (!folderId || folderId === rootFolderId || folderId === 'root') {
    return true;
  }

  let currId: string | null = folderId;
  let iterations = 0;
  const MAX_DEPTH = 20;

  while (currId && currId !== rootFolderId && currId !== 'root' && iterations < MAX_DEPTH) {
    iterations++;
    try {
      const file = await service.getFile(currId, 'id,name,parents');
      if (file.parentId === rootFolderId) {
        return true;
      }
      currId = file.parentId;
    } catch {
      return false;
    }
  }

  return currId === rootFolderId;
}
