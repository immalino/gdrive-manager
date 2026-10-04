import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgresql://gdrive:gdrive@localhost:5432/gdrive_manager';
  process.env.TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');
  process.env.BETTER_AUTH_SECRET ??= 'test-better-auth-secret-1234567890';
  process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
});

const mockDeleteFile = vi.fn().mockResolvedValue(undefined);
const mockRenameFile = vi.fn().mockResolvedValue(undefined);
const mockMoveFile = vi.fn().mockResolvedValue(undefined);
const mockCopyFile = vi.fn().mockImplementation((id, name, parentId) =>
  Promise.resolve({
    id: `copied-${id}`,
    name,
    mimeType: 'text/plain',
    sizeBytes: 100,
    modifiedAt: '2026-10-04T00:00:00Z',
    parentId: parentId ?? 'root',
    webViewLink: null,
    accountId: 'acc-1',
    accountEmail: 'primary@gmail.com',
  }),
);
const mockDownloadFile = vi.fn().mockResolvedValue(new Response('file content', { status: 200 }));
const mockListFiles = vi.fn().mockResolvedValue({ files: [], nextPageToken: null });

vi.mock('@/lib/google-drive/service', () => ({
  GoogleDriveService: {
    forAccount: vi.fn().mockImplementation(() =>
      Promise.resolve({
        deleteFile: mockDeleteFile,
        renameFile: mockRenameFile,
        moveFile: mockMoveFile,
        copyFile: mockCopyFile,
        downloadFile: mockDownloadFile,
        listFiles: mockListFiles,
      }),
    ),
  },
}));

vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock('@/lib/rate-limit/distributed', () => ({
  rateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfterMs: 0 }),
  distributedRateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfterMs: 0 }),
}));

const mockPrimaryAccount = {
  id: 'acc-primary',
  userId: 'user-1',
  email: 'primary@gmail.com',
  role: 'primary',
  status: 'connected',
};

const mockPoolAccount = {
  id: 'acc-pool',
  userId: 'user-1',
  email: 'pool@gmail.com',
  role: 'pool',
  status: 'connected',
};

const mockSharedRoot = {
  id: 'root-1',
  userId: 'user-1',
  primaryAccountId: 'acc-primary',
  driveFolderId: 'shared-root-folder-id',
  folderName: 'GDrive Pool',
};

vi.mock('@/lib/shared-drive/setup', () => ({
  getSetupStatus: vi.fn().mockResolvedValue({
    isSetupDone: true,
    sharedRoot: mockSharedRoot,
    primaryAccount: mockPrimaryAccount,
  }),
}));

const mockDbDelete = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbInsert = vi.fn();
const mockDbSelect = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => {
        const queryObj = {
          innerJoin: () => queryObj,
          where: () => queryObj,
          limit: () => mockDbSelect(),
          then: <TResult1 = unknown, TResult2 = never>(
            resolve?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
            reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
          ) => Promise.resolve(mockDbSelect()).then(resolve, reject),
        };
        return queryObj;
      },
    }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => mockDbInsert(),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => mockDbUpdate(),
      }),
    }),
    delete: () => ({
      where: () => mockDbDelete(),
    }),
    query: {
      googleAccounts: {
        findFirst: vi.fn().mockResolvedValue(mockPrimaryAccount),
      },
    },
  },
}));

vi.mock('@/lib/google/tokens', () => ({
  getAccountForUser: vi.fn().mockImplementation((userId, accountId) => {
    if (accountId === 'acc-primary') return Promise.resolve(mockPrimaryAccount);
    if (accountId === 'acc-pool') return Promise.resolve(mockPoolAccount);
    return Promise.resolve({ ...mockPrimaryAccount, id: accountId });
  }),
}));

// Mock withAuth to directly pass mock user
vi.mock('@/lib/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/http')>();
  return {
    ...actual,
    withAuth: (
      handler: (
        user: { id: string; email: string },
        req: NextRequest,
        ctx: unknown,
      ) => Promise<Response>,
    ) => {
      return async (req: NextRequest, ctx: unknown) => {
        try {
          return await handler({ id: 'user-1', email: 'user@example.com' }, req, ctx);
        } catch (err) {
          return actual.errorResponse(err);
        }
      };
    },
  };
});

describe('File Operations in Shared Drive Context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DELETE /api/files/[id]', () => {
    it('mengambil akun pemilik otomatis dari drive_files jika accountId tidak diberikan', async () => {
      const { DELETE } = await import('@/app/api/files/[id]/route');
      mockDbSelect.mockResolvedValueOnce([{ account: mockPoolAccount }]);

      const req = new NextRequest('http://localhost:3000/api/files/file-123', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: Promise.resolve({ id: 'file-123' }) });

      expect(res.status).toBe(200);
      expect(mockDeleteFile).toHaveBeenCalledWith('file-123');
      expect(mockDbDelete).toHaveBeenCalled();
    }, 15_000);
  });

  describe('GET /api/files/[id]/download', () => {
    it('mengunduh file menggunakan akun pemilik yang di-resolve otomatis', async () => {
      const { GET } = await import('@/app/api/files/[id]/download/route');
      mockDbSelect.mockResolvedValueOnce([{ account: mockPoolAccount }]);

      const req = new NextRequest('http://localhost:3000/api/files/file-123/download');
      const res = await GET(req, { params: Promise.resolve({ id: 'file-123' }) });

      expect(res.status).toBe(200);
      expect(mockDownloadFile).toHaveBeenCalledWith('file-123');
    });
  });

  describe('PATCH /api/files/[id]', () => {
    it('rename file dan update drive_files cache', async () => {
      const { PATCH } = await import('@/app/api/files/[id]/route');
      mockDbSelect.mockResolvedValueOnce([{ account: mockPrimaryAccount }]);

      const req = new NextRequest('http://localhost:3000/api/files/file-123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'new-name.pdf' }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: 'file-123' }) });

      expect(res.status).toBe(200);
      expect(mockRenameFile).toHaveBeenCalledWith('file-123', 'new-name.pdf');
      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it('memindahkan file ke root shared drive saat target folderId adalah root', async () => {
      const { PATCH } = await import('@/app/api/files/[id]/route');
      mockDbSelect.mockResolvedValueOnce([{ account: mockPrimaryAccount }]);

      const req = new NextRequest('http://localhost:3000/api/files/file-123', {
        method: 'PATCH',
        body: JSON.stringify({ folderId: 'root' }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: 'file-123' }) });

      expect(res.status).toBe(200);
      expect(mockMoveFile).toHaveBeenCalledWith('file-123', null, 'shared-root-folder-id');
      expect(mockDbUpdate).toHaveBeenCalled();
    });
  });

  describe('POST /api/files/[id]/copy', () => {
    it('menyalin file ke shared root folder dan cache salinan ke drive_files', async () => {
      const { POST } = await import('@/app/api/files/[id]/copy/route');
      mockDbSelect.mockResolvedValueOnce([{ account: mockPrimaryAccount }]);

      const req = new NextRequest('http://localhost:3000/api/files/file-123/copy', {
        method: 'POST',
        body: JSON.stringify({ name: 'copy.txt', folderId: 'root' }),
      });
      const res = await POST(req, { params: Promise.resolve({ id: 'file-123' }) });

      expect(res.status).toBe(201);
      expect(mockCopyFile).toHaveBeenCalledWith('file-123', 'copy.txt', 'shared-root-folder-id');
      expect(mockDbInsert).toHaveBeenCalled();
    });
  });

  describe('POST /api/files/bulk-delete', () => {
    it('menghapus item dari beberapa akun berbeda sekaligus', async () => {
      const { POST } = await import('@/app/api/files/bulk-delete/route');
      mockDbSelect.mockResolvedValueOnce([mockPrimaryAccount, mockPoolAccount]);

      const req = new NextRequest('http://localhost:3000/api/files/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            { id: 'f-1', accountId: 'acc-primary', name: 'f1.txt' },
            { id: 'f-2', accountId: 'acc-pool', name: 'f2.txt' },
          ],
        }),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.deletedCount).toBe(2);
      expect(json.failedCount).toBe(0);
      expect(mockDeleteFile).toHaveBeenCalledWith('f-1');
      expect(mockDeleteFile).toHaveBeenCalledWith('f-2');
    });
  });

  describe('POST /api/files/bulk-move', () => {
    it('memindahkan item dari akun berbeda tanpa error cross-account', async () => {
      const { POST } = await import('@/app/api/files/bulk-move/route');
      mockDbSelect.mockResolvedValueOnce([mockPrimaryAccount, mockPoolAccount]);

      const req = new NextRequest('http://localhost:3000/api/files/bulk-move', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            { id: 'f-1', accountId: 'acc-primary' },
            { id: 'f-2', accountId: 'acc-pool' },
          ],
          targetFolderId: 'root',
        }),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.movedCount).toBe(2);
      expect(json.failedCount).toBe(0);
      expect(mockMoveFile).toHaveBeenCalledWith('f-1', null, 'shared-root-folder-id');
      expect(mockMoveFile).toHaveBeenCalledWith('f-2', null, 'shared-root-folder-id');
    });
  });

  describe('GET /api/files (Scoped Search)', () => {
    it('mencari file di drive_files index cache saat search diberikan dalam shared root context', async () => {
      const { GET } = await import('@/app/api/files/route');
      mockDbSelect.mockResolvedValueOnce([mockPrimaryAccount, mockPoolAccount]);
      mockDbSelect.mockResolvedValueOnce([
        {
          id: 'file-search-1',
          name: 'invoice-march.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1500,
          modifiedAt: new Date('2026-03-01T00:00:00Z'),
          parentId: 'folder-sub-1',
          accountId: 'acc-pool',
          accountEmail: 'pool@gmail.com',
        },
      ]);

      const req = new NextRequest('http://localhost:3000/api/files?search=invoice');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.files.length).toBe(1);
      expect(json.files[0].name).toBe('invoice-march.pdf');
      expect(json.files[0].accountId).toBe('acc-pool');
    });
  });
});
