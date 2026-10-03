import type { GoogleDriveService } from '@/lib/google-drive/service';
import type { BreadcrumbItem } from '@/types';

export interface FolderBreadcrumbResult {
  currentFolder: BreadcrumbItem;
  breadcrumb: BreadcrumbItem[];
}

export async function getFolderBreadcrumb(
  service: GoogleDriveService,
  rootFolderId: string,
  currentFolderId?: string | null,
  rootName = 'My Drive',
): Promise<FolderBreadcrumbResult> {
  const rootItem: BreadcrumbItem = { id: rootFolderId, name: rootName };

  if (!currentFolderId || currentFolderId === rootFolderId || currentFolderId === 'root') {
    return {
      currentFolder: rootItem,
      breadcrumb: [rootItem],
    };
  }

  const chain: BreadcrumbItem[] = [];
  let currId: string | null = currentFolderId;
  let iterations = 0;
  const MAX_DEPTH = 20;

  while (currId && currId !== rootFolderId && currId !== 'root' && iterations < MAX_DEPTH) {
    iterations++;
    try {
      const file = await service.getFile(currId, 'id,name,parents');
      chain.unshift({ id: file.id, name: file.name });
      currId = file.parentId;
    } catch {
      // If fetching a parent fails (e.g. permission or not found), break chain
      break;
    }
  }

  const breadcrumb: BreadcrumbItem[] = [rootItem, ...chain];
  const currentFolder = chain.length > 0 ? chain[chain.length - 1]! : rootItem;

  return {
    currentFolder,
    breadcrumb,
  };
}
