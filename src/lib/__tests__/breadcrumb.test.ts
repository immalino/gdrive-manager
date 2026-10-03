import { describe, expect, it, vi } from 'vitest';
import type { GoogleDriveService } from '@/lib/google-drive/service';
import { getFolderBreadcrumb } from '@/lib/shared-drive/breadcrumb';

function createMockService(
  files: Record<string, { id: string; name: string; parentId: string | null }>,
) {
  return {
    getFile: vi.fn().mockImplementation(async (id: string) => {
      const f = files[id];
      if (!f) throw new Error('File not found');
      return {
        id: f.id,
        name: f.name,
        mimeType: 'application/vnd.google-apps.folder',
        sizeBytes: null,
        modifiedAt: null,
        parentId: f.parentId,
        webViewLink: null,
        accountId: 'acc-1',
        accountEmail: 'test@example.com',
      };
    }),
  } as unknown as GoogleDriveService;
}

describe('getFolderBreadcrumb', () => {
  const rootId = 'root-100';

  it('mengembalikan hanya root jika folderId sama dengan root atau root string atau kosong', async () => {
    const service = createMockService({});
    const res1 = await getFolderBreadcrumb(service, rootId, rootId);
    expect(res1.breadcrumb).toEqual([{ id: rootId, name: 'My Drive' }]);
    expect(res1.currentFolder).toEqual({ id: rootId, name: 'My Drive' });

    const res2 = await getFolderBreadcrumb(service, rootId, 'root');
    expect(res2.breadcrumb).toEqual([{ id: rootId, name: 'My Drive' }]);

    const res3 = await getFolderBreadcrumb(service, rootId, undefined);
    expect(res3.breadcrumb).toEqual([{ id: rootId, name: 'My Drive' }]);
    expect(service.getFile).not.toHaveBeenCalled();
  });

  it('menavigasi 1 level subfolder di bawah root', async () => {
    const service = createMockService({
      'folder-docs': { id: 'folder-docs', name: 'Documents', parentId: rootId },
    });

    const res = await getFolderBreadcrumb(service, rootId, 'folder-docs');
    expect(res.breadcrumb).toEqual([
      { id: rootId, name: 'My Drive' },
      { id: 'folder-docs', name: 'Documents' },
    ]);
    expect(res.currentFolder).toEqual({ id: 'folder-docs', name: 'Documents' });
    expect(service.getFile).toHaveBeenCalledTimes(1);
    expect(service.getFile).toHaveBeenCalledWith('folder-docs', 'id,name,parents');
  });

  it('menavigasi bertingkat hingga root', async () => {
    const service = createMockService({
      'folder-sub2': { id: 'folder-sub2', name: 'Reports', parentId: 'folder-sub1' },
      'folder-sub1': { id: 'folder-sub1', name: 'Finance', parentId: rootId },
    });

    const res = await getFolderBreadcrumb(service, rootId, 'folder-sub2');
    expect(res.breadcrumb).toEqual([
      { id: rootId, name: 'My Drive' },
      { id: 'folder-sub1', name: 'Finance' },
      { id: 'folder-sub2', name: 'Reports' },
    ]);
    expect(res.currentFolder).toEqual({ id: 'folder-sub2', name: 'Reports' });
    expect(service.getFile).toHaveBeenCalledTimes(2);
  });

  it('menangani kesalahan getFile dengan graceful degradation', async () => {
    const service = createMockService({
      'folder-orphan': { id: 'folder-orphan', name: 'Orphan', parentId: 'missing-parent' },
    });

    const res = await getFolderBreadcrumb(service, rootId, 'folder-orphan');
    expect(res.breadcrumb).toEqual([
      { id: rootId, name: 'My Drive' },
      { id: 'folder-orphan', name: 'Orphan' },
    ]);
    expect(res.currentFolder).toEqual({ id: 'folder-orphan', name: 'Orphan' });
  });

  it('menghormati custom rootName', async () => {
    const service = createMockService({});
    const res = await getFolderBreadcrumb(service, rootId, rootId, 'Custom Pool');
    expect(res.breadcrumb).toEqual([{ id: rootId, name: 'Custom Pool' }]);
    expect(res.currentFolder).toEqual({ id: rootId, name: 'Custom Pool' });
  });
});
