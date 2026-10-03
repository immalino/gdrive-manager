import type { GoogleAccount } from '@/db/schema';
import { mapGoogleError } from '@/lib/google/errors';
import { getValidAccessToken } from '@/lib/google/tokens';
import type { DriveFileDto, DriveQuota } from './types';

const API_BASE = 'https://www.googleapis.com/drive/v3';

interface ListOptions {
  q?: string;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
}

export class GoogleDriveService {
  constructor(
    private account: GoogleAccount,
    private accessToken: string,
  ) {}

  static async forAccount(account: GoogleAccount): Promise<GoogleDriveService> {
    return new GoogleDriveService(account, await getValidAccessToken(account));
  }

  protected async request(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.accessToken}`, ...init.headers },
    });
    if (!res.ok) throw mapGoogleError(res, this.account);
    return res;
  }

  async getStorageQuota(): Promise<DriveQuota> {
    const res = await this.request('/about?fields=storageQuota');
    const body = (await res.json()) as { storageQuota?: { limit?: string; usage?: string } };
    const usedBytes = Number(body.storageQuota?.usage ?? 0);
    const totalBytes = body.storageQuota?.limit ? Number(body.storageQuota.limit) : null;
    return {
      totalBytes,
      usedBytes,
      freeBytes: totalBytes === null ? null : Math.max(totalBytes - usedBytes, 0),
    };
  }

  async listFiles(
    options: ListOptions = {},
  ): Promise<{ files: DriveFileDto[]; nextPageToken: string | null }> {
    const params = new URLSearchParams({
      q: options.q ?? 'trashed = false',
      pageSize: String(options.pageSize ?? 100),
      fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,webViewLink)',
      orderBy: options.orderBy ?? 'modifiedTime desc',
      spaces: 'drive',
    });
    if (options.pageToken) params.set('pageToken', options.pageToken);
    const res = await this.request(`/files?${params.toString()}`);
    const body = (await res.json()) as {
      nextPageToken?: string;
      files?: Array<{
        id: string;
        name: string;
        mimeType: string;
        size?: string;
        modifiedTime?: string;
        parents?: string[];
        webViewLink?: string;
      }>;
    };
    const files: DriveFileDto[] = (body.files ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      sizeBytes: f.size ? Number(f.size) : null,
      modifiedAt: f.modifiedTime ?? null,
      parentId: f.parents?.[0] ?? null,
      webViewLink: f.webViewLink ?? null,
      accountId: this.account.id,
      accountEmail: this.account.email,
    }));
    return { files, nextPageToken: body.nextPageToken ?? null };
  }

  async uploadFile(): Promise<never> {
    throw new Error('uploadFile diimplementasi di Sesi 6');
  }
  async downloadFile(fileId?: string): Promise<never> {
    throw new Error(`downloadFile diimplementasi di Sesi 6 (fileId=${fileId ?? '-'})`);
  }
  async deleteFile(): Promise<never> {
    throw new Error('deleteFile diimplementasi di Sesi 6');
  }
  async createFolder(): Promise<never> {
    throw new Error('createFolder diimplementasi di Sesi 6');
  }
}
