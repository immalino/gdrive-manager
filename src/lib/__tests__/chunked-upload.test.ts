import { describe, expect, it, vi } from 'vitest';
import { buildContentRangeHeader, parseResumeOffset } from '@/lib/upload/chunk-helpers';
import { uploadFileChunked } from '@/lib/upload/chunked-uploader';
import type { QueueItem } from '@/lib/upload/upload-queue';

describe('Chunk Helpers', () => {
  it('membuat header Content-Range dengan benar', () => {
    const header = buildContentRangeHeader(0, 5242879, 15000000);
    expect(header).toBe('bytes 0-5242879/15000000');
  });

  it('mengurai header Range respons Google 308', () => {
    // Google mengembalikan header: Range: bytes=0-5242879
    const offset = parseResumeOffset('bytes=0-5242879');
    expect(offset).toBe(5242880);
  });

  it('mengembalikan 0 jika header Range tidak ada atau kosong', () => {
    expect(parseResumeOffset(null)).toBe(0);
    expect(parseResumeOffset('')).toBe(0);
  });
});

describe('uploadFileChunked', () => {
  it('menggunakan streaming langsung untuk file kecil di bawah threshold', async () => {
    const file = new File(['small content'], 'small.txt', { type: 'text/plain' });
    const item: QueueItem = {
      id: 'item-1',
      file,
      mode: 'auto',
      status: 'uploading',
      progress: 0,
      abortController: new AbortController(),
    };

    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const progressCalls: number[] = [];
    await uploadFileChunked(item, (pct) => progressCalls.push(pct), {
      threshold: 1024 * 1024,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/files/upload?mode=auto&filename=small.txt'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(progressCalls).toContain(100);
    vi.unstubAllGlobals();
  });

  it('menginisiasi sesi dan mengirim chunk bertahap untuk file besar', async () => {
    // File 12 bytes, chunk size 5 bytes: 3 chunks (0-4, 5-9, 10-11)
    const content = '123456789012';
    const file = new File([content], 'large.bin', { type: 'application/octet-stream' });
    const item: QueueItem = {
      id: 'item-2',
      file,
      mode: 'manual',
      accountId: 'acc-1',
      status: 'uploading',
      progress: 0,
      abortController: new AbortController(),
    };

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/files/upload/session') {
        return Promise.resolve(
          new Response(
            JSON.stringify({ jobId: 'job-123', accountId: 'acc-1', sessionUri: 'https://sess' }),
            { status: 201 },
          ),
        );
      }
      if (url.includes('/api/files/upload/chunk')) {
        const range = (init?.headers as Record<string, string>)?.['Content-Range'];
        if (range === 'bytes 0-4/12') {
          return Promise.resolve(
            new Response(JSON.stringify({ completed: false, uploadedBytes: 5 }), { status: 200 }),
          );
        }
        if (range === 'bytes 5-9/12') {
          return Promise.resolve(
            new Response(JSON.stringify({ completed: false, uploadedBytes: 10 }), { status: 200 }),
          );
        }
        if (range === 'bytes 10-11/12') {
          return Promise.resolve(
            new Response(JSON.stringify({ completed: true, uploadedBytes: 12 }), { status: 200 }),
          );
        }
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    const progressCalls: number[] = [];
    await uploadFileChunked(item, (pct) => progressCalls.push(pct), {
      threshold: 10,
      chunkSize: 5,
    });

    expect(item.jobId).toBe('job-123');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/files/upload/session',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/files/upload/chunk?jobId=job-123',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Range': 'bytes 0-4/12' }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/files/upload/chunk?jobId=job-123',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Range': 'bytes 5-9/12' }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/files/upload/chunk?jobId=job-123',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Range': 'bytes 10-11/12' }),
      }),
    );
    expect(progressCalls[progressCalls.length - 1]).toBe(100);
    vi.unstubAllGlobals();
  });

  it('tahan putus koneksi: resume dari offset status server setelah chunk gagal', async () => {
    // File 10 bytes, chunk size 5 bytes: chunk 0-4, chunk 5-9
    const file = new File(['0123456789'], 'resilient.bin', { type: 'application/octet-stream' });
    const item: QueueItem = {
      id: 'item-3',
      file,
      mode: 'auto',
      status: 'uploading',
      progress: 0,
      abortController: new AbortController(),
    };

    let chunk2Attempt = 0;
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/files/upload/session') {
        return Promise.resolve(
          new Response(JSON.stringify({ jobId: 'job-resilient' }), { status: 201 }),
        );
      }
      if (url.includes('/status')) {
        // Server mengonfirmasi sudah menerima 5 byte pertama
        return Promise.resolve(
          new Response(JSON.stringify({ offset: 5, completed: false }), { status: 200 }),
        );
      }
      if (url.includes('/api/files/upload/chunk')) {
        const range = (init?.headers as Record<string, string>)?.['Content-Range'];
        if (range === 'bytes 0-4/10') {
          return Promise.resolve(
            new Response(JSON.stringify({ completed: false, uploadedBytes: 5 }), { status: 200 }),
          );
        }
        if (range === 'bytes 5-9/10') {
          chunk2Attempt++;
          if (chunk2Attempt === 1) {
            // Simulasi network drop pada attempt 1
            return Promise.reject(new Error('Network disconnected'));
          }
          // Attempt 2 sukses
          return Promise.resolve(
            new Response(JSON.stringify({ completed: true, uploadedBytes: 10 }), { status: 200 }),
          );
        }
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    const progressCalls: number[] = [];
    await uploadFileChunked(item, (pct) => progressCalls.push(pct), {
      threshold: 8,
      chunkSize: 5,
    });

    expect(chunk2Attempt).toBe(2);
    expect(progressCalls[progressCalls.length - 1]).toBe(100);
    vi.unstubAllGlobals();
  });

  it('menghentikan upload dan melempar error saat dibatalkan (abort)', async () => {
    const file = new File(['0123456789'], 'aborted.bin', { type: 'application/octet-stream' });
    const ac = new AbortController();
    const item: QueueItem = {
      id: 'item-4',
      file,
      mode: 'auto',
      status: 'uploading',
      progress: 0,
      abortController: ac,
    };

    ac.abort();

    await expect(uploadFileChunked(item, () => {}, { threshold: 5, chunkSize: 5 })).rejects.toThrow(
      'Aborted',
    );
  });
});
