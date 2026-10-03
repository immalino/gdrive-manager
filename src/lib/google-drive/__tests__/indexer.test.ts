import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GoogleAccount } from '@/db/schema';
import { indexAccountFiles } from '../indexer';

vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgresql://gdrive:gdrive@localhost:5432/gdrive_manager';
  process.env.TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');
});

const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockOnConflict = vi.fn();

vi.mock('@/db', () => ({
  db: {
    insert: (...args: unknown[]) => {
      mockInsert(...args);
      return {
        values: (...valArgs: unknown[]) => {
          mockValues(...valArgs);
          return {
            onConflictDoUpdate: (...confArgs: unknown[]) => {
              mockOnConflict(...confArgs);
              return Promise.resolve();
            },
          };
        },
      };
    },
  },
}));

const mockListFiles = vi.fn();
vi.mock('@/lib/google-drive/service', () => ({
  GoogleDriveService: {
    forAccount: vi.fn().mockImplementation(() =>
      Promise.resolve({
        listFiles: mockListFiles,
      }),
    ),
  },
}));

const testAccount = {
  id: 'acc-1',
  userId: 'user-1',
  googleAccountId: 'g-1',
  email: 'acc1@gmail.com',
  name: 'Account 1',
  picture: null,
  accessToken: 'v1.access',
  refreshTokenEncrypted: 'v1.refresh',
  tokenExpiresAt: new Date(Date.now() + 3600_000),
  status: 'connected',
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies GoogleAccount;

describe('indexAccountFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mengindeks file halaman tunggal dan berhenti jika nextPageToken null', async () => {
    mockListFiles.mockResolvedValueOnce({
      files: [
        {
          id: 'f1',
          name: 'doc1.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          modifiedAt: '2026-01-01T00:00:00Z',
          parentId: 'root',
          webViewLink: null,
          accountId: 'acc-1',
          accountEmail: 'acc1@gmail.com',
        },
      ],
      nextPageToken: null,
    });

    const total = await indexAccountFiles(testAccount);

    expect(total).toBe(1);
    expect(mockListFiles).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          driveFileId: 'f1',
          name: 'doc1.pdf',
          kind: 'document',
        }),
      ]),
    );
  });

  it('mengindeks banyak halaman sampai nextPageToken habis', async () => {
    mockListFiles
      .mockResolvedValueOnce({
        files: [
          {
            id: 'f1',
            name: 'img1.png',
            mimeType: 'image/png',
            sizeBytes: 2048,
            modifiedAt: null,
            parentId: null,
            webViewLink: null,
            accountId: 'acc-1',
            accountEmail: 'acc1@gmail.com',
          },
        ],
        nextPageToken: 'page2-token',
      })
      .mockResolvedValueOnce({
        files: [
          {
            id: 'f2',
            name: 'video.mp4',
            mimeType: 'video/mp4',
            sizeBytes: 4096,
            modifiedAt: null,
            parentId: null,
            webViewLink: null,
            accountId: 'acc-1',
            accountEmail: 'acc1@gmail.com',
          },
        ],
        nextPageToken: null,
      });

    const total = await indexAccountFiles(testAccount);

    expect(total).toBe(2);
    expect(mockListFiles).toHaveBeenCalledTimes(2);
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('berhenti jika files kosong', async () => {
    mockListFiles.mockResolvedValueOnce({
      files: [],
      nextPageToken: 'token-ignored',
    });

    const total = await indexAccountFiles(testAccount);

    expect(total).toBe(0);
    expect(mockListFiles).toHaveBeenCalledTimes(1);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
