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
});
