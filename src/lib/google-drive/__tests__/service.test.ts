import { describe, expect, it, vi } from 'vitest';
import type { GoogleAccount } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { mapGoogleError } from '@/lib/google/errors';
import { GoogleDriveService } from '@/lib/google-drive/service';

vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgresql://gdrive:gdrive@localhost:5432/gdrive_manager';
  process.env.TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');
});

const account = {
  id: 'acc-1',
  userId: 'user-1',
  googleAccountId: 'g-1',
  email: 'account1@gmail.com',
  name: 'Account One',
  picture: null,
  accessToken: 'v1.encrypted',
  refreshTokenEncrypted: 'v1.encrypted',
  tokenExpiresAt: new Date(Date.now() + 3_600_000),
  status: 'connected',
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies GoogleAccount;

function service(): GoogleDriveService {
  return new GoogleDriveService(account, 'access-token-123');
}

describe('GoogleDriveService.getStorageQuota', () => {
  it('mengurai storageQuota dari Drive API', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ storageQuota: { limit: '16106127360', usage: '10952166400' } }),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const quota = await service().getStorageQuota();

    expect(quota.totalBytes).toBe(16106127360);
    expect(quota.usedBytes).toBe(10952166400);
    expect(quota.freeBytes).toBe(16106127360 - 10952166400);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.googleapis.com/drive/v3/about?fields=storageQuota',
      expect.objectContaining({
        headers: { Authorization: 'Bearer access-token-123' },
      }),
    );
    vi.unstubAllGlobals();
  });

  it('limit tidak ada (akun Workspace tanpa limit) → total/free null', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ storageQuota: {} }), { status: 200 })),
    );

    const quota = await service().getStorageQuota();

    expect(quota.totalBytes).toBeNull();
    expect(quota.usedBytes).toBe(0);
    expect(quota.freeBytes).toBeNull();
    vi.unstubAllGlobals();
  });

  it('usage melebihi limit → free dibatasi 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ storageQuota: { limit: '100', usage: '150' } }), {
          status: 200,
        }),
      ),
    );

    const quota = await service().getStorageQuota();

    expect(quota.freeBytes).toBe(0);
    vi.unstubAllGlobals();
  });

  it('response 401 → AppError TOKEN_EXPIRED', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));

    const error = await service()
      .getStorageQuota()
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe('TOKEN_EXPIRED');
    expect((error as AppError).status).toBe(401);
    expect((error as AppError).message).toContain(account.email);
    vi.unstubAllGlobals();
  });

  it('response 429 → AppError RATE_LIMITED', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429 })));

    const error = await service()
      .getStorageQuota()
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe('RATE_LIMITED');
    vi.unstubAllGlobals();
  });
});

describe('mapGoogleError', () => {
  const cases: [number, AppError['code'], number][] = [
    [401, 'TOKEN_EXPIRED', 401],
    [403, 'PERMISSION_DENIED', 403],
    [404, 'NOT_FOUND', 404],
    [410, 'NOT_FOUND', 404],
    [429, 'RATE_LIMITED', 429],
    [500, 'GOOGLE_UNAVAILABLE', 502],
    [503, 'GOOGLE_UNAVAILABLE', 502],
  ];

  it.each(cases)('status %i → %s (%i)', async (status, code, httpStatus) => {
    const error = await mapGoogleError(new Response('{}', { status }), account);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(code);
    expect(error.status).toBe(httpStatus);
  });

  it('status 403 dengan reason userRateLimit → RATE_LIMITED 429', async () => {
    const body = JSON.stringify({
      error: { errors: [{ reason: 'userRateLimitExceeded' }] },
    });
    const error = await mapGoogleError(new Response(body, { status: 403 }), account);
    expect(error.code).toBe('RATE_LIMITED');
    expect(error.status).toBe(429);
  });

  it('body bukan JSON → fallback tidak error', async () => {
    const error = await mapGoogleError(
      new Response('Internal Error HTML', { status: 502 }),
      account,
    );
    expect(error.code).toBe('GOOGLE_UNAVAILABLE');
    expect(error.status).toBe(502);
  });
});

describe('GoogleDriveService file & folder operations', () => {
  it('renameFile mengirim PATCH dengan name baru', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'f-1', name: 'new.txt' }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await service().renameFile('f-1', 'new.txt');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.googleapis.com/drive/v3/files/f-1?fields=id,name',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'new.txt' }),
      }),
    );
    vi.unstubAllGlobals();
  });

  it('moveFile memanggil PATCH dengan addParents dan removeParents', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'f-1' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await service().moveFile('f-1', 'old-parent', 'new-parent');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/files/f-1?fields=id%2Cparents&addParents=new-parent&removeParents=old-parent',
      ),
      expect.objectContaining({ method: 'PATCH' }),
    );
    vi.unstubAllGlobals();
  });

  it('copyFile mengirim POST dan mengembalikan DriveFileDto terpetakan', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'copy-1',
          name: 'copy.txt',
          mimeType: 'text/plain',
          size: '1024',
          modifiedTime: '2026-10-03T10:00:00Z',
          parents: ['folder-1'],
          webViewLink: 'https://drive.google.com/copy',
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await service().copyFile('f-1', 'copy.txt', 'folder-1');

    expect(result).toEqual({
      id: 'copy-1',
      name: 'copy.txt',
      mimeType: 'text/plain',
      sizeBytes: 1024,
      modifiedAt: '2026-10-03T10:00:00Z',
      parentId: 'folder-1',
      webViewLink: 'https://drive.google.com/copy',
      accountId: account.id,
      accountEmail: account.email,
    });
    vi.unstubAllGlobals();
  });

  it('listFolders mengembalikan daftar folder dari API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          files: [
            { id: 'dir-1', name: 'Documents' },
            { id: 'dir-2', name: 'Photos' },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const folders = await service().listFolders();

    expect(folders).toHaveLength(2);
    expect(folders[0]).toEqual({ id: 'dir-1', name: 'Documents' });
    vi.unstubAllGlobals();
  });

  it('listFolders dengan parentId menyaring berdasarkan parent', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ files: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await service().listFolders('parent-123');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("'parent-123'%20in%20parents"),
      expect.anything(),
    );
    vi.unstubAllGlobals();
  });

  it('listFolders dengan search menyaring berdasarkan nama', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ files: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await service().listFolders(undefined, 'Project');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("name%20contains%20'Project'"),
      expect.anything(),
    );
    vi.unstubAllGlobals();
  });
});

describe('GoogleDriveService resumable chunked upload methods', () => {
  it('initiateResumableSession mengembalikan upload location URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: {
          location: 'https://www.googleapis.com/upload/drive/v3/files?upload_id=resumable-123',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const sessionUri = await service().initiateResumableSession({
      filename: 'large.zip',
      mimeType: 'application/zip',
      fileSize: 15_000_000,
      parentId: 'folder-1',
    });

    expect(sessionUri).toBe(
      'https://www.googleapis.com/upload/drive/v3/files?upload_id=resumable-123',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('uploadType=resumable'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token-123',
          'X-Upload-Content-Type': 'application/zip',
          'X-Upload-Content-Length': '15000000',
        }),
      }),
    );
    vi.unstubAllGlobals();
  });

  it('getResumableOffset mengembalikan offset jika Google mengembalikan 308 Range', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 308,
        headers: { range: 'bytes=0-5242879' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const offset = await service().getResumableOffset('https://upload.session/uri', 15_000_000);
    expect(offset).toBe(5242880);
    expect(fetchMock).toHaveBeenCalledWith('https://upload.session/uri', {
      method: 'PUT',
      headers: { 'Content-Range': 'bytes */15000000' },
    });
    vi.unstubAllGlobals();
  });

  it('getResumableOffset mengembalikan fileSize jika Google mengembalikan 200 (sudah selesai)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const offset = await service().getResumableOffset('https://upload.session/uri', 15_000_000);
    expect(offset).toBe(15_000_000);
    vi.unstubAllGlobals();
  });

  it('uploadChunk mengembalikan completed: false jika status 308', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 308 }));
    vi.stubGlobal('fetch', fetchMock);

    const chunk = new Uint8Array([1, 2, 3, 4]).buffer;
    const res = await service().uploadChunk({
      sessionUri: 'https://upload.session/uri',
      chunk,
      startByte: 0,
      totalSize: 100,
    });

    expect(res.completed).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith('https://upload.session/uri', {
      method: 'PUT',
      headers: {
        'Content-Length': '4',
        'Content-Range': 'bytes 0-3/100',
      },
      body: chunk,
    });
    vi.unstubAllGlobals();
  });

  it('uploadChunk mengembalikan completed: true dan file DTO jika status 200', async () => {
    const fileBody = {
      id: 'file-resumable-1',
      name: 'large.zip',
      mimeType: 'application/zip',
      size: '100',
      modifiedTime: '2026-10-03T12:00:00Z',
      parents: ['folder-1'],
      webViewLink: 'https://drive.google.com/file/d/file-resumable-1/view',
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(fileBody), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const chunk = new Uint8Array([1, 2, 3, 4]).buffer;
    const res = await service().uploadChunk({
      sessionUri: 'https://upload.session/uri',
      chunk,
      startByte: 96,
      totalSize: 100,
    });

    expect(res.completed).toBe(true);
    expect(res.file?.id).toBe('file-resumable-1');
    expect(res.file?.sizeBytes).toBe(100);
    expect(res.file?.accountId).toBe(account.id);
    vi.unstubAllGlobals();
  });
});
