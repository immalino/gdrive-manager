import type { QueueItem } from './upload-queue';

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB (kelipatan 256 KB sesuai spesifikasi Google Drive)
export const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10 MB

export function uploadSmallFile(item: QueueItem, onProgress: (pct: number) => void): Promise<void> {
  const folderParam = item.folderId ? `&parentId=${encodeURIComponent(item.folderId)}` : '';
  const url =
    item.mode === 'auto'
      ? `/api/files/upload?mode=auto&filename=${encodeURIComponent(item.file.name)}${folderParam}`
      : `/api/files/upload?mode=manual&accountId=${encodeURIComponent(item.accountId || '')}&filename=${encodeURIComponent(item.file.name)}${folderParam}`;

  if (typeof XMLHttpRequest !== 'undefined') {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      if (item.abortController) {
        if (item.abortController.signal.aborted) {
          reject(new Error('Aborted'));
          return;
        }
        item.abortController.signal.addEventListener('abort', () => xhr.abort());
      }

      xhr.open('POST', url);
      xhr.setRequestHeader('content-type', item.file.type || 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        let body: { error?: { message?: string } } | null = null;
        try {
          body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch {
          body = null;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          const errMsg = body?.error?.message ?? `Upload gagal (HTTP ${xhr.status})`;
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => reject(new Error('Koneksi gagal saat upload.'));
      xhr.onabort = () => reject(new Error('Aborted'));

      xhr.send(item.file);
    });
  }

  // Fallback to fetch (e.g. testing in Node)
  return fetch(url, {
    method: 'POST',
    headers: {
      'content-type': item.file.type || 'application/octet-stream',
    },
    body: item.file,
    signal: item.abortController?.signal,
  }).then(async (res) => {
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error?.message ?? `Upload gagal (HTTP ${res.status})`);
    }
    onProgress(100);
  });
}

async function sendChunk(params: {
  jobId: string;
  chunk: Blob;
  startByte: number;
  endByte: number;
  totalSize: number;
  signal?: AbortSignal;
  onProgress?: (loaded: number) => void;
}): Promise<{ completed: boolean; uploadedBytes: number }> {
  if (typeof XMLHttpRequest !== 'undefined') {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      if (params.signal) {
        if (params.signal.aborted) {
          reject(new Error('Aborted'));
          return;
        }
        params.signal.addEventListener('abort', () => xhr.abort());
      }

      xhr.open('PUT', `/api/files/upload/chunk?jobId=${encodeURIComponent(params.jobId)}`);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.setRequestHeader(
        'Content-Range',
        `bytes ${params.startByte}-${params.endByte}/${params.totalSize}`,
      );

      if (params.onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            params.onProgress!(e.loaded);
          }
        };
      }

      xhr.onload = () => {
        let body: {
          completed?: boolean;
          uploadedBytes?: number;
          error?: { message?: string };
        } | null = null;
        try {
          body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch {
          body = null;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            completed: body?.completed ?? false,
            uploadedBytes: body?.uploadedBytes ?? params.endByte + 1,
          });
        } else {
          const errMsg = body?.error?.message ?? `Upload chunk gagal (HTTP ${xhr.status})`;
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => reject(new Error('Koneksi terputus saat upload chunk.'));
      xhr.onabort = () => reject(new Error('Aborted'));

      xhr.send(params.chunk);
    });
  }

  // Fallback to fetch (e.g. testing in Node)
  const res = await fetch(`/api/files/upload/chunk?jobId=${encodeURIComponent(params.jobId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Range': `bytes ${params.startByte}-${params.endByte}/${params.totalSize}`,
    },
    body: params.chunk,
    signal: params.signal,
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    throw new Error(errJson?.error?.message ?? `Upload chunk gagal (HTTP ${res.status})`);
  }

  const body = (await res.json()) as { completed?: boolean; uploadedBytes?: number };
  if (params.onProgress) {
    params.onProgress(params.endByte - params.startByte + 1);
  }

  return {
    completed: body?.completed ?? false,
    uploadedBytes: body?.uploadedBytes ?? params.endByte + 1,
  };
}

export async function uploadFileChunked(
  item: QueueItem,
  onProgress: (pct: number) => void,
  options?: { chunkSize?: number; threshold?: number },
): Promise<void> {
  if (item.abortController?.signal.aborted) {
    throw new Error('Aborted');
  }

  const threshold = options?.threshold ?? LARGE_FILE_THRESHOLD;
  const chunkSize = options?.chunkSize ?? CHUNK_SIZE;

  // File kecil (< 10 MB): gunakan streaming langsung
  if (item.file.size < threshold) {
    return uploadSmallFile(item, onProgress);
  }

  // File besar (≥ 10 MB): gunakan chunked resumable upload
  let startOffset = 0;

  // Cek apakah item sudah memiliki jobId sebelumnya (misal dari retry)
  if (item.jobId) {
    try {
      const statusRes = await fetch(
        `/api/files/upload/session/${encodeURIComponent(item.jobId)}/status`,
        { signal: item.abortController?.signal },
      );
      if (statusRes.ok) {
        const data = (await statusRes.json()) as { offset?: number; completed?: boolean };
        if (data.completed) {
          onProgress(100);
          return;
        }
        startOffset = typeof data.offset === 'number' ? data.offset : 0;
      } else {
        item.jobId = undefined;
      }
    } catch (err: unknown) {
      if (
        item.abortController?.signal.aborted ||
        (err instanceof Error && (err.name === 'AbortError' || err.message === 'Aborted'))
      ) {
        throw new Error('Aborted');
      }
      item.jobId = undefined;
    }
  }

  // Inisiasi sesi resumable bila belum ada
  if (!item.jobId) {
    if (item.abortController?.signal.aborted) {
      throw new Error('Aborted');
    }

    try {
      const sessionRes = await fetch('/api/files/upload/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: item.file.name,
          fileSize: item.file.size,
          contentType: item.file.type || 'application/octet-stream',
          accountId: item.accountId,
          folderId: item.folderId,
          mode: item.mode,
        }),
        signal: item.abortController?.signal,
      });

      if (!sessionRes.ok) {
        const errJson = await sessionRes.json().catch(() => null);
        throw new Error(
          errJson?.error?.message ?? `Gagal inisiasi sesi upload (HTTP ${sessionRes.status})`,
        );
      }

      const sessionData = (await sessionRes.json()) as { jobId: string };
      item.jobId = sessionData.jobId;
      startOffset = 0;
    } catch (err: unknown) {
      if (
        item.abortController?.signal.aborted ||
        (err instanceof Error && (err.name === 'AbortError' || err.message === 'Aborted'))
      ) {
        throw new Error('Aborted');
      }
      throw err;
    }
  }

  let currentOffset = startOffset;
  const totalSize = item.file.size;
  const maxRetries = 3;

  while (currentOffset < totalSize) {
    if (item.abortController?.signal.aborted) {
      throw new Error('Aborted');
    }

    const endOffset = Math.min(currentOffset + chunkSize, totalSize);
    const chunkBlob = item.file.slice(currentOffset, endOffset);
    const endByte = endOffset - 1;

    let attempt = 0;
    let chunkSuccess = false;

    while (attempt < maxRetries && !chunkSuccess) {
      if (item.abortController?.signal.aborted) {
        throw new Error('Aborted');
      }

      try {
        const result = await sendChunk({
          jobId: item.jobId!,
          chunk: chunkBlob,
          startByte: currentOffset,
          endByte,
          totalSize,
          signal: item.abortController?.signal,
          onProgress: (chunkLoaded) => {
            const loadedTotal = currentOffset + chunkLoaded;
            const pct = Math.min(99, Math.round((loadedTotal / totalSize) * 100));
            onProgress(pct);
          },
        });

        chunkSuccess = true;
        currentOffset = result.completed ? totalSize : endOffset;
        const pct = Math.round((currentOffset / totalSize) * 100);
        onProgress(pct);
      } catch (err: unknown) {
        const isAborted =
          item.abortController?.signal.aborted ||
          (err instanceof Error && err.message === 'Aborted');

        if (isAborted) {
          throw new Error('Aborted');
        }

        attempt++;
        if (attempt >= maxRetries) {
          throw err;
        }

        // Tunggu sebentar sebelum retry (backoff)
        await new Promise((r) => setTimeout(r, 500 * attempt));

        // Inquiry status offset ke server untuk sinkronisasi byte range
        try {
          const statusRes = await fetch(
            `/api/files/upload/session/${encodeURIComponent(item.jobId!)}/status`,
            { signal: item.abortController?.signal },
          );
          if (statusRes.ok) {
            const statusData = (await statusRes.json()) as { offset?: number; completed?: boolean };
            if (statusData.completed) {
              onProgress(100);
              return;
            }
            if (typeof statusData.offset === 'number' && statusData.offset > currentOffset) {
              currentOffset = statusData.offset;
              chunkSuccess = true;
              break;
            }
          }
        } catch {
          // Abaikan error status check dan ulangi chunk saat ini
        }
      }
    }
  }
}
