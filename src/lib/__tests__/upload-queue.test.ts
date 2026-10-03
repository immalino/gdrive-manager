import { describe, expect, it, vi } from 'vitest';
import { UploadQueueManager, type QueueItem } from '@/lib/upload/upload-queue';

describe('UploadQueueManager', () => {
  it('membatasi concurrency maksimum sesuai konfigurasi', async () => {
    const queue = new UploadQueueManager({ maxConcurrency: 2 });
    let running = 0;
    let maxRunning = 0;

    const mockUploader = vi.fn(async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 50));
      running--;
    });

    queue.setUploader(mockUploader);

    const dummyFiles = [
      new File(['a'], 'a.txt', { type: 'text/plain' }),
      new File(['b'], 'b.txt', { type: 'text/plain' }),
      new File(['c'], 'c.txt', { type: 'text/plain' }),
      new File(['d'], 'd.txt', { type: 'text/plain' }),
    ];

    queue.addFiles(dummyFiles, { mode: 'auto' });
    await queue.waitForAll();

    expect(maxRunning).toBe(2);
    expect(mockUploader).toHaveBeenCalledTimes(4);
    expect(queue.getItems().every((item) => item.status === 'completed')).toBe(true);
  });

  it('bisa membatalkan item yang sedang berjalan via AbortController', async () => {
    const queue = new UploadQueueManager({ maxConcurrency: 1 });
    const mockUploader = vi.fn(async (item: QueueItem) => {
      await new Promise((resolve, reject) => {
        item.abortController?.signal.addEventListener('abort', () => reject(new Error('Aborted')));
      });
    });

    queue.setUploader(mockUploader);
    const file = new File(['test'], 'cancel.txt', { type: 'text/plain' });
    const [item] = queue.addFiles([file], { mode: 'auto' });

    setTimeout(() => {
      queue.cancelItem(item.id);
    }, 10);

    await queue.waitForAll();
    expect(queue.getItem(item.id)?.status).toBe('cancelled');
  });

  it('dapat mengulang file yang gagal (retry)', async () => {
    const queue = new UploadQueueManager({ maxConcurrency: 1 });
    let attempt = 0;
    const mockUploader = vi.fn(async () => {
      attempt++;
      if (attempt === 1) throw new Error('Network error');
    });

    queue.setUploader(mockUploader);
    const file = new File(['fail'], 'retry.txt', { type: 'text/plain' });
    const [item] = queue.addFiles([file], { mode: 'auto' });

    await queue.waitForAll();
    expect(queue.getItem(item.id)?.status).toBe('failed');

    // Retry
    queue.retryItem(item.id);
    await queue.waitForAll();
    expect(queue.getItem(item.id)?.status).toBe('completed');
  });

  it('retryAllFailed mengulang semua item yang gagal', async () => {
    const queue = new UploadQueueManager({ maxConcurrency: 2 });
    let shouldFail = true;
    const mockUploader = vi.fn(async () => {
      if (shouldFail) throw new Error('Upload error');
    });

    queue.setUploader(mockUploader);
    const files = [
      new File(['1'], 'f1.txt', { type: 'text/plain' }),
      new File(['2'], 'f2.txt', { type: 'text/plain' }),
    ];
    queue.addFiles(files, { mode: 'auto' });
    await queue.waitForAll();

    expect(queue.getItems().filter((i) => i.status === 'failed')).toHaveLength(2);

    shouldFail = false;
    queue.retryAllFailed();
    await queue.waitForAll();

    expect(queue.getItems().every((i) => i.status === 'completed')).toBe(true);
  });

  it('clearFinished menghapus item completed dan cancelled', async () => {
    const queue = new UploadQueueManager({ maxConcurrency: 2 });
    const mockUploader = vi.fn(async () => {});
    queue.setUploader(mockUploader);

    const files = [
      new File(['1'], 'f1.txt', { type: 'text/plain' }),
      new File(['2'], 'f2.txt', { type: 'text/plain' }),
    ];
    queue.addFiles(files, { mode: 'auto' });
    await queue.waitForAll();

    expect(queue.getItems()).toHaveLength(2);
    queue.clearFinished();
    expect(queue.getItems()).toHaveLength(0);
  });

  it('bisa membatalkan item yang masih berstatus queued', async () => {
    const queue = new UploadQueueManager({ maxConcurrency: 1 });
    const mockUploader = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    queue.setUploader(mockUploader);

    const files = [
      new File(['1'], 'running.txt', { type: 'text/plain' }),
      new File(['2'], 'waiting.txt', { type: 'text/plain' }),
    ];
    const [, item2] = queue.addFiles(files, { mode: 'auto' });
    queue.cancelItem(item2.id);

    await queue.waitForAll();
    expect(queue.getItem(item2.id)?.status).toBe('cancelled');
  });
});
