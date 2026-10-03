export type UploadStatus = 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelled';

export interface QueueItem {
  id: string;
  file: File;
  accountId?: string;
  folderId?: string;
  mode: 'auto' | 'manual';
  status: UploadStatus;
  progress: number; // 0 - 100
  error?: string;
  abortController?: AbortController;
  uploadedAt?: Date;
}

export type QueueListener = (items: QueueItem[]) => void;
export type FileUploader = (item: QueueItem, onProgress: (pct: number) => void) => Promise<void>;

export class UploadQueueManager {
  private items: Map<string, QueueItem> = new Map();
  private maxConcurrency: number;
  private activeUploads = 0;
  private listeners: Set<QueueListener> = new Set();
  private uploader?: FileUploader;
  private allDoneResolvers: Array<() => void> = [];

  constructor(options: { maxConcurrency?: number; uploader?: FileUploader } = {}) {
    this.maxConcurrency = options.maxConcurrency ?? 2;
    if (options.uploader) {
      this.uploader = options.uploader;
    }
  }

  setUploader(uploader: FileUploader) {
    this.uploader = uploader;
    this.processQueue();
  }

  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener(this.getItems());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const list = this.getItems();
    this.listeners.forEach((cb) => cb(list));
    if (this.activeUploads === 0 && !list.some((i) => i.status === 'queued')) {
      const resolvers = [...this.allDoneResolvers];
      this.allDoneResolvers = [];
      resolvers.forEach((r) => r());
    }
  }

  getItems(): QueueItem[] {
    return Array.from(this.items.values());
  }

  getItem(id: string): QueueItem | undefined {
    return this.items.get(id);
  }

  addFiles(
    files: File[],
    options: { accountId?: string; folderId?: string; mode: 'auto' | 'manual' },
  ): QueueItem[] {
    const newItems: QueueItem[] = files.map((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const item: QueueItem = {
        id,
        file,
        accountId: options.accountId,
        folderId: options.folderId,
        mode: options.mode,
        status: 'queued',
        progress: 0,
        abortController: new AbortController(),
      };
      this.items.set(id, item);
      return item;
    });

    this.notify();
    this.processQueue();
    return newItems;
  }

  private async processQueue() {
    if (!this.uploader) return;

    while (this.activeUploads < this.maxConcurrency) {
      const nextItem = Array.from(this.items.values()).find((i) => i.status === 'queued');
      if (!nextItem) break;

      this.activeUploads++;
      nextItem.status = 'uploading';
      nextItem.error = undefined;
      nextItem.abortController = new AbortController();
      this.notify();

      this.executeUpload(nextItem);
    }
  }

  private async executeUpload(item: QueueItem) {
    try {
      await this.uploader!(item, (pct) => {
        if (!item.abortController?.signal.aborted) {
          item.progress = pct;
          this.notify();
        }
      });
      if (item.abortController?.signal.aborted || item.status === 'cancelled') {
        item.status = 'cancelled';
      } else {
        item.status = 'completed';
        item.progress = 100;
        item.uploadedAt = new Date();
      }
    } catch (err: unknown) {
      const isAborted =
        item.abortController?.signal.aborted || (err instanceof Error && err.message === 'Aborted');

      if (isAborted) {
        item.status = 'cancelled';
      } else {
        item.status = 'failed';
        item.error = err instanceof Error ? err.message : 'Upload gagal';
      }
    } finally {
      this.activeUploads--;
      this.notify();
      this.processQueue();
    }
  }

  cancelItem(id: string) {
    const item = this.items.get(id);
    if (!item) return;
    if (item.status === 'uploading') {
      item.abortController?.abort();
      item.status = 'cancelled';
    } else if (item.status === 'queued') {
      item.status = 'cancelled';
    }
    this.notify();
  }

  retryItem(id: string) {
    const item = this.items.get(id);
    if (!item || (item.status !== 'failed' && item.status !== 'cancelled')) return;
    item.status = 'queued';
    item.progress = 0;
    item.error = undefined;
    this.notify();
    this.processQueue();
  }

  retryAllFailed() {
    for (const item of this.items.values()) {
      if (item.status === 'failed') {
        item.status = 'queued';
        item.progress = 0;
        item.error = undefined;
      }
    }
    this.notify();
    this.processQueue();
  }

  clearFinished() {
    for (const [id, item] of this.items.entries()) {
      if (item.status === 'completed' || item.status === 'cancelled') {
        this.items.delete(id);
      }
    }
    this.notify();
  }

  waitForAll(): Promise<void> {
    if (
      this.activeUploads === 0 &&
      !Array.from(this.items.values()).some((i) => i.status === 'queued')
    ) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.allDoneResolvers.push(resolve);
    });
  }
}

export const defaultBrowserUploader: FileUploader = (item, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    if (item.abortController) {
      if (item.abortController.signal.aborted) {
        reject(new Error('Aborted'));
        return;
      }
      item.abortController.signal.addEventListener('abort', () => {
        xhr.abort();
      });
    }

    const folderParam = item.folderId ? `&parentId=${encodeURIComponent(item.folderId)}` : '';
    const url =
      item.mode === 'auto'
        ? `/api/files/upload?mode=auto&filename=${encodeURIComponent(item.file.name)}${folderParam}`
        : `/api/files/upload?mode=manual&accountId=${encodeURIComponent(item.accountId || '')}&filename=${encodeURIComponent(item.file.name)}${folderParam}`;

    xhr.open('POST', url);
    xhr.setRequestHeader('content-type', item.file.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: { error?: { code?: string; message?: string } } | null = null;
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
};

// Global singleton instance for application client
export const globalUploadQueue = new UploadQueueManager({
  maxConcurrency: 2,
  uploader: typeof window !== 'undefined' ? defaultBrowserUploader : undefined,
});
