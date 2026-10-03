import { describe, expect, it } from 'vitest';
import { sortFiles } from '@/lib/files/merge';
import type { DriveFileDto } from '@/lib/google-drive/types';

function file(overrides: Partial<DriveFileDto>): DriveFileDto {
  return {
    id: 'f-1',
    name: 'file',
    mimeType: 'application/octet-stream',
    sizeBytes: null,
    modifiedAt: null,
    parentId: null,
    webViewLink: null,
    accountId: 'acct-1',
    accountEmail: 'a@example.com',
    ...overrides,
  };
}

describe('sortFiles', () => {
  const files = [
    file({ id: '1', name: 'beta.pdf', sizeBytes: 10, modifiedAt: '2026-01-02T00:00:00Z' }),
    file({ id: '2', name: 'alpha.pdf', sizeBytes: null, modifiedAt: null }),
    file({ id: '3', name: 'gamma.pdf', sizeBytes: 30, modifiedAt: '2026-01-01T00:00:00Z' }),
  ];

  it('urut nama asc/desc case-insensitive', () => {
    expect(sortFiles(files, 'name', 'asc').map((f) => f.name)).toEqual([
      'alpha.pdf',
      'beta.pdf',
      'gamma.pdf',
    ]);
    expect(sortFiles(files, 'name', 'desc').map((f) => f.name)).toEqual([
      'gamma.pdf',
      'beta.pdf',
      'alpha.pdf',
    ]);
  });

  it('urut size: null dianggap paling kecil', () => {
    expect(sortFiles(files, 'size', 'asc').map((f) => f.sizeBytes)).toEqual([null, 10, 30]);
    expect(sortFiles(files, 'size', 'desc').map((f) => f.sizeBytes)).toEqual([30, 10, null]);
  });

  it('urut modified: null dianggap paling awal', () => {
    expect(sortFiles(files, 'modified', 'asc').map((f) => f.modifiedAt)).toEqual([
      null,
      '2026-01-01T00:00:00Z',
      '2026-01-02T00:00:00Z',
    ]);
    expect(sortFiles(files, 'modified', 'desc').map((f) => f.modifiedAt)).toEqual([
      '2026-01-02T00:00:00Z',
      '2026-01-01T00:00:00Z',
      null,
    ]);
  });

  it('recent files: sort modified desc dan batasi ke 8 file', () => {
    const manyFiles = Array.from({ length: 15 }, (_, i) =>
      file({
        id: `f-${i}`,
        name: `file-${i}.txt`,
        modifiedAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
      }),
    );
    const recent = sortFiles(manyFiles, 'modified', 'desc').slice(0, 8);
    expect(recent).toHaveLength(8);
    expect(recent[0]?.name).toBe('file-14.txt');
    expect(recent[7]?.name).toBe('file-7.txt');
  });

  it('tidak mengubah array input', () => {
    const input = [...files];
    sortFiles(input, 'name', 'asc');
    expect(input.map((f) => f.name)).toEqual(['beta.pdf', 'alpha.pdf', 'gamma.pdf']);
  });
});
