import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { GoogleDriveService } from '@/lib/google-drive/service';
import { isSubfolderOfSharedRoot } from '@/lib/shared-drive/validation';
import { POST as uploadPost } from '@/app/api/files/upload/route';
import { POST as folderPost } from '@/app/api/folders/route';
import { NextRequest } from 'next/server';

vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgresql://gdrive:gdrive@localhost:5432/gdrive_manager';
  process.env.TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');
  process.env.BETTER_AUTH_SECRET ??= 'test-better-auth-secret-1234567890';
  process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
});

const mockSetupStatus = vi.fn();
vi.mock('@/lib/shared-drive/setup', () => ({
  getSetupStatus: (...args: unknown[]) => mockSetupStatus(...args),
}));

const mockGetAccountForUser = vi.fn();
vi.mock('@/lib/google/tokens', () => ({
  getAccountForUser: (...args: unknown[]) => mockGetAccountForUser(...args),
}));

const mockUploadFile = vi.fn();
const mockCreateFolder = vi.fn();
const mockGetFile = vi.fn();

vi.mock('@/lib/google-drive/service', () => ({
  GoogleDriveService: {
    forAccount: vi.fn().mockImplementation(() =>
      Promise.resolve({
        uploadFile: mockUploadFile,
        createFolder: mockCreateFolder,
        getFile: mockGetFile,
      }),
    ),
  },
}));

vi.mock('@/lib/quota', () => ({
  syncQuota: vi.fn().mockResolvedValue({ freeBytes: 10_000_000 }),
}));

vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/rate-limit/distributed', () => ({
  rateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfterMs: 0 }),
  distributedRateLimit: vi.fn().mockResolvedValue({ ok: true, retryAfterMs: 0 }),
}));

const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => mockDbSelect(),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: () => mockDbInsert(),
        onConflictDoUpdate: () => mockDbInsert(),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => mockDbUpdate(),
      }),
    }),
  },
}));

// Mock withAuth to directly execute the handler with a mock user
vi.mock('@/lib/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/http')>();
  return {
    ...actual,
    withAuth: (
      handler: (user: { id: string; email: string }, req: NextRequest) => Promise<Response>,
    ) => {
      return async (req: NextRequest) => {
        try {
          return await handler({ id: 'user-1', email: 'user@example.com' }, req);
        } catch (err) {
          return actual.errorResponse(err);
        }
      };
    },
  };
});

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

describe('isSubfolderOfSharedRoot', () => {
  const rootId = 'root-shared';

  it('mengembalikan true jika folderId sama dengan root atau root string atau kosong', async () => {
    const service = createMockService({});
    expect(await isSubfolderOfSharedRoot(service, rootId, rootId)).toBe(true);
    expect(await isSubfolderOfSharedRoot(service, rootId, 'root')).toBe(true);
    expect(await isSubfolderOfSharedRoot(service, rootId, undefined)).toBe(true);
    expect(await isSubfolderOfSharedRoot(service, rootId, null)).toBe(true);
    expect(service.getFile).not.toHaveBeenCalled();
  });

  it('mengembalikan true untuk subfolder langsung di bawah shared root', async () => {
    const service = createMockService({
      'folder-sub': { id: 'folder-sub', name: 'Subfolder', parentId: rootId },
    });
    expect(await isSubfolderOfSharedRoot(service, rootId, 'folder-sub')).toBe(true);
    expect(service.getFile).toHaveBeenCalledWith('folder-sub', 'id,name,parents');
  });

  it('mengembalikan true untuk subfolder bersarang yang terhubung ke root', async () => {
    const service = createMockService({
      'folder-level-2': { id: 'folder-level-2', name: 'Child', parentId: 'folder-level-1' },
      'folder-level-1': { id: 'folder-level-1', name: 'Parent', parentId: rootId },
    });
    expect(await isSubfolderOfSharedRoot(service, rootId, 'folder-level-2')).toBe(true);
  });

  it('mengembalikan false jika rantai folder tidak terhubung ke shared root', async () => {
    const service = createMockService({
      'alien-sub': { id: 'alien-sub', name: 'Alien', parentId: 'other-root' },
      'other-root': { id: 'other-root', name: 'Other Root', parentId: null },
    });
    expect(await isSubfolderOfSharedRoot(service, rootId, 'alien-sub')).toBe(false);
  });

  it('mengembalikan false jika getFile gagal atau folder tidak ditemukan', async () => {
    const service = createMockService({});
    expect(await isSubfolderOfSharedRoot(service, rootId, 'non-existent')).toBe(false);
  });
});

describe('Folder & Upload API in Shared Virtual Drive', () => {
  const mockPrimaryAccount = {
    id: 'acc-primary',
    userId: 'user-1',
    email: 'primary@example.com',
    role: 'primary',
  };
  const mockPoolAccount = {
    id: 'acc-pool',
    userId: 'user-1',
    email: 'pool@example.com',
    role: 'pool',
  };
  const mockSharedRoot = {
    id: 'root-db-1',
    userId: 'user-1',
    primaryAccountId: 'acc-primary',
    driveFolderId: 'shared-root-drive-id',
    folderName: 'GDrive Pool',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetupStatus.mockResolvedValue({
      isSetupDone: true,
      sharedRoot: mockSharedRoot,
      primaryAccount: mockPrimaryAccount,
    });
    mockGetAccountForUser.mockResolvedValue(mockPrimaryAccount);
    mockDbSelect.mockResolvedValue([mockPrimaryAccount, mockPoolAccount]);
    mockDbInsert.mockResolvedValue([{ id: 'job-1' }]);
    mockDbUpdate.mockResolvedValue([]);
    mockUploadFile.mockResolvedValue({
      id: 'file-uploaded-1',
      name: 'test.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      parentId: 'shared-root-drive-id',
    });
    mockCreateFolder.mockResolvedValue({
      id: 'folder-created-1',
      name: 'New Folder',
      mimeType: 'application/vnd.google-apps.folder',
      parentId: 'shared-root-drive-id',
    });
  });

  it('POST /api/folders selalu membuat folder menggunakan primary account dan default ke shared root', async () => {
    const req = new NextRequest('http://localhost:3000/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name: 'Proyek' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await folderPost(req);
    expect(res.status).toBe(201);
    expect(mockCreateFolder).toHaveBeenCalledWith('Proyek', 'shared-root-drive-id');
  });

  it('POST /api/folders menggunakan parentFolderId saat diberikan', async () => {
    const req = new NextRequest('http://localhost:3000/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name: 'Sub Proyek', parentFolderId: 'sub-folder-123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await folderPost(req);
    expect(res.status).toBe(201);
    expect(mockCreateFolder).toHaveBeenCalledWith('Sub Proyek', 'sub-folder-123');
  });

  it('POST /api/files/upload otomatis menggunakan shared root jika parentFolderId tidak ada', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/files/upload?filename=test.pdf&mode=auto',
      {
        method: 'POST',
        body: new Uint8Array([1, 2, 3, 4]),
        headers: {
          'Content-Length': '4',
          'Content-Type': 'application/pdf',
        },
      },
    );

    const res = await uploadPost(req);
    expect(res.status).toBe(201);
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'test.pdf',
        parentId: 'shared-root-drive-id',
      }),
    );
  });

  it('POST /api/files/upload menolak upload jika parentFolderId bukan subfolder dari shared root', async () => {
    // getFile untuk alien-folder mengembalikan parent null (tidak mencapai shared root)
    mockGetFile.mockResolvedValue({
      id: 'alien-folder',
      name: 'Alien',
      parentId: null,
    });

    const req = new NextRequest(
      'http://localhost:3000/api/files/upload?filename=test.pdf&mode=auto&parentFolderId=alien-folder',
      {
        method: 'POST',
        body: new Uint8Array([1, 2, 3, 4]),
        headers: {
          'Content-Length': '4',
          'Content-Type': 'application/pdf',
        },
      },
    );

    const res = await uploadPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('parentFolderId bukan subfolder');
  });

  it('POST /api/files/upload menerima upload saat parentFolderId adalah subfolder valid', async () => {
    // getFile untuk valid-sub mengembalikan parentId = shared-root-drive-id
    mockGetFile.mockResolvedValue({
      id: 'valid-sub',
      name: 'Valid Sub',
      parentId: 'shared-root-drive-id',
    });

    const req = new NextRequest(
      'http://localhost:3000/api/files/upload?filename=test.pdf&mode=auto&parentFolderId=valid-sub',
      {
        method: 'POST',
        body: new Uint8Array([1, 2, 3, 4]),
        headers: {
          'Content-Length': '4',
          'Content-Type': 'application/pdf',
        },
      },
    );

    const res = await uploadPost(req);
    expect(res.status).toBe(201);
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'test.pdf',
        parentId: 'valid-sub',
      }),
    );
  });
});
