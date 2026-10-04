import { describe, expect, it } from 'vitest';
import { selectAccount } from '@/lib/upload/select-account';

describe('selectAccount', () => {
  it('contoh PRD §6.3: file 5GB → Account B (12GB free)', () => {
    const accounts = [
      { id: 'A', freeBytes: 2 * 1024 ** 3 },
      { id: 'B', freeBytes: 12 * 1024 ** 3 },
      { id: 'C', freeBytes: 7 * 1024 ** 3 },
    ];
    expect(selectAccount(5 * 1024 ** 3, accounts)?.id).toBe('B');
  });

  it('tidak ada yang muat → null', () => {
    expect(selectAccount(100, [{ id: 'A', freeBytes: 10 }])).toBeNull();
  });

  it('freeBytes null dianggap tidak layak', () => {
    expect(selectAccount(1, [{ id: 'A', freeBytes: null as unknown as number }])).toBeNull();
  });

  it('dipilih yang free terbesar', () => {
    const result = selectAccount(1, [
      { id: 'A', freeBytes: 5 },
      { id: 'B', freeBytes: 9 },
      { id: 'C', freeBytes: 7 },
    ]);
    expect(result?.id).toBe('B');
  });

  it('akun dengan ruang lebih besar dilewati jika isUploadEnabled = false (skenario user)', () => {
    const accounts = [
      { id: 'A', freeBytes: 15 * 1024 ** 3, isUploadEnabled: false },
      { id: 'B', freeBytes: 2 * 1024 ** 3, isUploadEnabled: true },
    ];
    // File 1 GB muat di B dan A, tapi A dinonaktifkan → harus memilih B
    expect(selectAccount(1 * 1024 ** 3, accounts)?.id).toBe('B');
  });

  it('jika file muat di akun yang dinonaktifkan tetapi tidak muat di akun aktif → null', () => {
    const accounts = [
      { id: 'A', freeBytes: 15 * 1024 ** 3, isUploadEnabled: false },
      { id: 'B', freeBytes: 2 * 1024 ** 3, isUploadEnabled: true },
    ];
    // File 3 GB tidak muat di B (2 GB), dan A dinonaktifkan → null
    expect(selectAccount(3 * 1024 ** 3, accounts)).toBeNull();
  });

  it('jika semua akun isUploadEnabled = false → null', () => {
    const accounts = [
      { id: 'A', freeBytes: 10 * 1024 ** 3, isUploadEnabled: false },
      { id: 'B', freeBytes: 10 * 1024 ** 3, isUploadEnabled: false },
    ];
    expect(selectAccount(100, accounts)).toBeNull();
  });
});
