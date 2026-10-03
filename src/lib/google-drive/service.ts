import type { GoogleAccount } from '@/db/schema';
import { mapGoogleError } from '@/lib/google/errors';
import { getValidAccessToken } from '@/lib/google/tokens';
import type { DriveQuota } from './types';

const API_BASE = 'https://www.googleapis.com/drive/v3';

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

  async listFiles(): Promise<never> {
    throw new Error('listFiles diimplementasi di Sesi 5');
  }
  async uploadFile(): Promise<never> {
    throw new Error('uploadFile diimplementasi di Sesi 6');
  }
  async downloadFile(): Promise<never> {
    throw new Error('downloadFile diimplementasi di Sesi 6');
  }
  async deleteFile(): Promise<never> {
    throw new Error('deleteFile diimplementasi di Sesi 6');
  }
  async createFolder(): Promise<never> {
    throw new Error('createFolder diimplementasi di Sesi 6');
  }
}
