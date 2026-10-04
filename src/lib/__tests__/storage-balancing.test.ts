import { describe, expect, it } from 'vitest';
import {
  calculateStorageImbalance,
  getBalancingRecommendations,
  type StorageAccountInput,
  type SharedFileInput,
  DEFAULT_QUOTA_BYTES,
} from '../storage/balancing';

describe('Storage Balancing Engine', () => {
  describe('calculateStorageImbalance', () => {
    it('mengembalikan score 0 dan isImbalanced false jika akun kurang dari 2', () => {
      const single: StorageAccountInput[] = [
        {
          id: 'acc-1',
          email: 'acc1@gmail.com',
          usedBytes: 5 * 1024 ** 3,
          totalBytes: 15 * 1024 ** 3,
        },
      ];
      const res = calculateStorageImbalance(single);
      expect(res.score).toBe(0);
      expect(res.isImbalanced).toBe(false);
      expect(res.accounts).toHaveLength(1);
      expect(res.accounts[0]?.usagePercentage).toBe(33);

      const empty = calculateStorageImbalance([]);
      expect(empty.score).toBe(0);
      expect(empty.isImbalanced).toBe(false);
    });

    it('mengembalikan score rendah (<25) dan isImbalanced false ketika akun seimbang', () => {
      const accounts: StorageAccountInput[] = [
        {
          id: 'acc-1',
          email: 'acc1@gmail.com',
          usedBytes: 7 * 1024 ** 3,
          totalBytes: 15 * 1024 ** 3,
        }, // ~47%
        {
          id: 'acc-2',
          email: 'acc2@gmail.com',
          usedBytes: 8 * 1024 ** 3,
          totalBytes: 15 * 1024 ** 3,
        }, // ~53%
      ];
      const res = calculateStorageImbalance(accounts);
      expect(res.isImbalanced).toBe(false);
      expect(res.score).toBeLessThan(25);
      expect(res.averageUsageRatio).toBeCloseTo(0.5, 1);
    });

    it('mendeteksi ketimpangan kuota (isImbalanced true, score >= 25)', () => {
      const accounts: StorageAccountInput[] = [
        {
          id: 'acc-1',
          email: 'acc1@gmail.com',
          usedBytes: 14 * 1024 ** 3,
          totalBytes: 15 * 1024 ** 3,
        }, // ~93%
        {
          id: 'acc-2',
          email: 'acc2@gmail.com',
          usedBytes: 2 * 1024 ** 3,
          totalBytes: 15 * 1024 ** 3,
        }, // ~13%
      ];
      const res = calculateStorageImbalance(accounts);
      expect(res.isImbalanced).toBe(true);
      expect(res.score).toBe(80); // 93% - 13% = 80%
      expect(res.accounts[0]?.freeBytes).toBe(1 * 1024 ** 3);
      expect(res.accounts[1]?.freeBytes).toBe(13 * 1024 ** 3);
    });

    it('menggunakan default 15GB jika totalBytes bernilai null atau 0', () => {
      const accounts: StorageAccountInput[] = [
        { id: 'acc-1', email: 'acc1@gmail.com', usedBytes: 10 * 1024 ** 3, totalBytes: null },
        { id: 'acc-2', email: 'acc2@gmail.com', usedBytes: 1 * 1024 ** 3, totalBytes: 0 },
      ];
      const res = calculateStorageImbalance(accounts);
      expect(res.accounts[0]?.totalBytes).toBe(DEFAULT_QUOTA_BYTES);
      expect(res.accounts[1]?.totalBytes).toBe(DEFAULT_QUOTA_BYTES);
    });
  });

  describe('getBalancingRecommendations', () => {
    it('mengembalikan array kosong jika kapasitas akun sudah seimbang', () => {
      const accounts: StorageAccountInput[] = [
        {
          id: 'acc-1',
          email: 'acc1@gmail.com',
          usedBytes: 7 * 1024 ** 3,
          totalBytes: 15 * 1024 ** 3,
        },
        {
          id: 'acc-2',
          email: 'acc2@gmail.com',
          usedBytes: 7.5 * 1024 ** 3,
          totalBytes: 15 * 1024 ** 3,
        },
      ];
      const files: SharedFileInput[] = [
        { id: 'f-1', name: 'video.mp4', sizeBytes: 1024 ** 3, accountId: 'acc-1' },
      ];

      const recs = getBalancingRecommendations(accounts, files);
      expect(recs).toEqual([]);
    });

    it('merekomendasikan migrasi file dari akun penuh ke akun lapang', () => {
      const accounts: StorageAccountInput[] = [
        {
          id: 'acc-full',
          email: 'full@gmail.com',
          usedBytes: 14 * 1024 ** 3,
          totalBytes: 15 * 1024 ** 3,
        },
        {
          id: 'acc-empty',
          email: 'empty@gmail.com',
          usedBytes: 1 * 1024 ** 3,
          totalBytes: 15 * 1024 ** 3,
        },
      ];
      const files: SharedFileInput[] = [
        {
          id: 'f-large',
          name: 'dataset.zip',
          sizeBytes: 4 * 1024 ** 3, // 4 GB
          accountId: 'acc-full',
        },
        {
          id: 'f-small',
          name: 'notes.txt',
          sizeBytes: 1024,
          accountId: 'acc-full',
        },
      ];

      const recs = getBalancingRecommendations(accounts, files);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0]?.fileId).toBe('f-large');
      expect(recs[0]?.sourceAccountId).toBe('acc-full');
      expect(recs[0]?.targetAccountId).toBe('acc-empty');
      expect(recs[0]?.reason).toContain('full@gmail.com');
      expect(recs[0]?.reason).toContain('empty@gmail.com');
    });

    it('tidak merekomendasikan folder atau file tanpa ukuran', () => {
      const accounts: StorageAccountInput[] = [
        {
          id: 'acc-1',
          email: 'acc1@gmail.com',
          usedBytes: 14 * 1024 ** 3,
          totalBytes: 15 * 1024 ** 3,
        },
        {
          id: 'acc-2',
          email: 'acc2@gmail.com',
          usedBytes: 1 * 1024 ** 3,
          totalBytes: 15 * 1024 ** 3,
        },
      ];
      const files: SharedFileInput[] = [
        {
          id: 'folder-1',
          name: 'MyFolder',
          sizeBytes: null,
          accountId: 'acc-1',
          mimeType: 'application/vnd.google-apps.folder',
        },
        {
          id: 'file-zero',
          name: 'empty.txt',
          sizeBytes: 0,
          accountId: 'acc-1',
        },
      ];

      const recs = getBalancingRecommendations(accounts, files);
      expect(recs).toHaveLength(0);
    });

    it('tidak merekomendasikan file jika akun tujuan tidak memiliki sisa ruang yang cukup', () => {
      const accounts: StorageAccountInput[] = [
        {
          id: 'acc-1',
          email: 'acc1@gmail.com',
          usedBytes: 14 * 1024 ** 3,
          totalBytes: 15 * 1024 ** 3,
        },
        {
          id: 'acc-2',
          email: 'acc2@gmail.com',
          usedBytes: 14.5 * 1024 ** 3,
          totalBytes: 15 * 1024 ** 3,
        }, // sisa 500 MB
      ];
      const files: SharedFileInput[] = [
        {
          id: 'huge-file',
          name: 'huge.iso',
          sizeBytes: 2 * 1024 ** 3, // 2 GB
          accountId: 'acc-1',
        },
      ];

      const recs = getBalancingRecommendations(accounts, files);
      expect(recs).toHaveLength(0);
    });
  });
});
