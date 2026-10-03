import type { GoogleAccount } from '@/db/schema';
import { AppError } from '@/lib/errors';
import { mapGoogleError } from '@/lib/google/errors';
import { getValidAccessToken } from '@/lib/google/tokens';
import { buildMoveParams } from '@/lib/files/move-params';
import { buildContentRangeHeader, parseResumeOffset } from '@/lib/upload/chunk-helpers';
import type { DriveFileDto, DriveQuota } from './types';

const API_BASE = 'https://www.googleapis.com/drive/v3';
// Endpoint upload resumable Google berdiri sendiri di /upload/drive/v3 (bukan di bawah API_BASE).
const UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

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
    if (!res.ok) throw await mapGoogleError(res, this.account);
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
    const rawQ = options.q ?? 'trashed = false';
    const driveQ =
      rawQ
        .split(' and ')
        .filter((part) => !part.trim().startsWith('size ') && !part.trim().startsWith('size='))
        .join(' and ') || 'trashed = false';

    const params = new URLSearchParams({
      q: driveQ,
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

  async uploadFile(params: {
    stream: ReadableStream<Uint8Array>;
    contentLength: number;
    contentType: string;
    filename: string;
    parentId?: string;
  }): Promise<DriveFileDto> {
    const metadata: Record<string, unknown> = { name: params.filename };
    if (params.parentId) metadata.parents = [params.parentId];

    const init = await fetch(
      `${UPLOAD_BASE}/files?uploadType=resumable&fields=id,name,mimeType,size,modifiedTime,parents,webViewLink`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': String(params.contentLength),
          'X-Upload-Content-Type': params.contentType || 'application/octet-stream',
        },
        body: JSON.stringify(metadata),
      },
    );
    if (!init.ok) throw await mapGoogleError(init, this.account);
    const sessionUrl = init.headers.get('location');
    if (!sessionUrl) throw new AppError('UPLOAD_FAILED', 'Gagal memulai sesi upload.', 502);

    const put = await fetch(sessionUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': String(params.contentLength),
        'Content-Type': params.contentType || 'application/octet-stream',
      },
      body: params.stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    if (!put.ok) throw await mapGoogleError(put, this.account);
    const body = (await put.json()) as {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      modifiedTime?: string;
      parents?: string[];
      webViewLink?: string;
    };
    return {
      id: body.id,
      name: body.name,
      mimeType: body.mimeType,
      sizeBytes: body.size ? Number(body.size) : params.contentLength,
      modifiedAt: body.modifiedTime ?? null,
      parentId: body.parents?.[0] ?? params.parentId ?? null,
      webViewLink: body.webViewLink ?? null,
      accountId: this.account.id,
      accountEmail: this.account.email,
    };
  }

  async initiateResumableSession(meta: {
    filename: string;
    mimeType: string;
    fileSize: number;
    parentId?: string;
  }): Promise<string> {
    const metadata = {
      name: meta.filename,
      ...(meta.parentId ? { parents: [meta.parentId] } : {}),
    };

    const res = await fetch(
      `${UPLOAD_BASE}/files?uploadType=resumable&fields=id,name,mimeType,size,modifiedTime,parents,webViewLink`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'X-Upload-Content-Type': meta.mimeType,
          'X-Upload-Content-Length': String(meta.fileSize),
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(metadata),
      },
    );

    if (!res.ok) throw await mapGoogleError(res, this.account);
    const location = res.headers.get('location');
    if (!location)
      throw new AppError('UPLOAD_FAILED', 'Google tidak mengembalikan upload session URL.', 500);
    return location;
  }

  async getResumableOffset(sessionUri: string, fileSize: number): Promise<number> {
    const res = await fetch(sessionUri, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes */${fileSize}`,
      },
    });

    if (res.status === 308) {
      return parseResumeOffset(res.headers.get('range'));
    }
    if (res.status === 200 || res.status === 201) {
      return fileSize; // sudah selesai
    }
    throw await mapGoogleError(res, this.account);
  }

  async uploadChunk(params: {
    sessionUri: string;
    chunk: ArrayBuffer;
    startByte: number;
    totalSize: number;
  }): Promise<{ completed: boolean; file?: DriveFileDto }> {
    const endByte = params.startByte + params.chunk.byteLength - 1;
    const contentRange = buildContentRangeHeader(params.startByte, endByte, params.totalSize);

    const res = await fetch(params.sessionUri, {
      method: 'PUT',
      headers: {
        'Content-Length': String(params.chunk.byteLength),
        'Content-Range': contentRange,
      },
      body: params.chunk,
    });

    if (res.status === 308) {
      return { completed: false };
    }

    if (res.status === 200 || res.status === 201) {
      const body = (await res.json()) as {
        id: string;
        name: string;
        mimeType: string;
        size?: string;
        modifiedTime?: string;
        parents?: string[];
        webViewLink?: string;
      };
      return {
        completed: true,
        file: {
          id: body.id,
          name: body.name,
          mimeType: body.mimeType,
          sizeBytes: body.size ? Number(body.size) : null,
          modifiedAt: body.modifiedTime ?? null,
          parentId: body.parents?.[0] ?? null,
          webViewLink: body.webViewLink ?? null,
          accountId: this.account.id,
          accountEmail: this.account.email,
        },
      };
    }

    throw await mapGoogleError(res, this.account);
  }

  async downloadFile(fileId: string): Promise<Response> {
    const meta = await this.request(`/files/${fileId}?fields=id,name,mimeType`);
    const file = (await meta.json()) as { id: string; name: string; mimeType: string };

    if (file.mimeType.startsWith('application/vnd.google-apps.')) {
      const exportMime = file.mimeType.includes('spreadsheet')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : file.mimeType.includes('presentation')
          ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
          : 'application/pdf';
      const res = await fetch(
        `${API_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        },
      );
      if (!res.ok) throw await mapGoogleError(res, this.account);
      return new Response(res.body, {
        status: 200,
        headers: {
          'content-type': exportMime,
          'content-disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
        },
      });
    }

    const res = await fetch(`${API_BASE}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) throw await mapGoogleError(res, this.account);
    const headers: Record<string, string> = {
      'content-type': res.headers.get('content-type') ?? 'application/octet-stream',
      'content-disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
    };
    // Hanya teruskan content-length bila Google mengirimnya dan body tidak
    // dikompresi — nilai kosong/salah membuat respons HTTP tidak valid.
    const contentLength = res.headers.get('content-length');
    if (contentLength && Number(contentLength) > 0 && !res.headers.get('content-encoding')) {
      headers['content-length'] = contentLength;
    }
    return new Response(res.body, { status: 200, headers });
  }

  async deleteFile(fileId: string): Promise<void> {
    const res = await this.request(`/files/${fileId}`, { method: 'DELETE' });
    if (res.status !== 204 && !res.ok) throw await mapGoogleError(res, this.account);
  }

  async createFolder(name: string, parentId?: string): Promise<DriveFileDto> {
    const res = await this.request(
      '/files?fields=id,name,mimeType,parents,webViewLink,modifiedTime',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          mimeType: 'application/vnd.google-apps.folder',
          ...(parentId ? { parents: [parentId] } : {}),
        }),
      },
    );
    const body = (await res.json()) as {
      id: string;
      name: string;
      mimeType: string;
      parents?: string[];
      webViewLink?: string;
      modifiedTime?: string;
    };
    return {
      id: body.id,
      name: body.name,
      mimeType: body.mimeType,
      sizeBytes: null,
      modifiedAt: body.modifiedTime ?? null,
      parentId: body.parents?.[0] ?? parentId ?? null,
      webViewLink: body.webViewLink ?? null,
      accountId: this.account.id,
      accountEmail: this.account.email,
    };
  }

  async renameFile(fileId: string, name: string): Promise<void> {
    const res = await this.request(`/files/${fileId}?fields=id,name`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw await mapGoogleError(res, this.account);
  }

  async moveFile(
    fileId: string,
    fromParentId: string | null,
    toParentId: string | null,
  ): Promise<void> {
    const { addParents, removeParents } = buildMoveParams(fromParentId, toParentId);
    const search = new URLSearchParams({ fields: 'id,parents' });
    if (addParents) search.set('addParents', addParents);
    if (removeParents) search.set('removeParents', removeParents);
    const res = await this.request(`/files/${fileId}?${search.toString()}`, { method: 'PATCH' });
    if (!res.ok) throw await mapGoogleError(res, this.account);
  }

  async copyFile(fileId: string, name: string, parentId?: string): Promise<DriveFileDto> {
    const res = await this.request(
      `/files/${fileId}/copy?fields=id,name,mimeType,size,modifiedTime,parents,webViewLink`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, ...(parentId ? { parents: [parentId] } : {}) }),
      },
    );
    if (!res.ok) throw await mapGoogleError(res, this.account);
    const body = (await res.json()) as {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      modifiedTime?: string;
      parents?: string[];
      webViewLink?: string;
    };
    return {
      id: body.id,
      name: body.name,
      mimeType: body.mimeType,
      sizeBytes: body.size ? Number(body.size) : null,
      modifiedAt: body.modifiedTime ?? null,
      parentId: body.parents?.[0] ?? parentId ?? null,
      webViewLink: body.webViewLink ?? null,
      accountId: this.account.id,
      accountEmail: this.account.email,
    };
  }

  async listFolders(
    parentId?: string,
    search?: string,
  ): Promise<Array<{ id: string; name: string }>> {
    let q = `mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
      const parentClause = parentId === 'root' ? `'root' in parents` : `'${parentId}' in parents`;
      q += ` and ${parentClause}`;
    }
    if (search?.trim()) {
      const escaped = search.trim().replace(/'/g, "\\'");
      q += ` and name contains '${escaped}'`;
    }
    const res = await this.request(
      `/files?pageSize=500&orderBy=name&q=${encodeURIComponent(q)}&fields=files(id,name)`,
    );
    const body = (await res.json()) as { files?: Array<{ id: string; name: string }> };
    return body.files ?? [];
  }

  async createSharedRootFolder(name: string): Promise<{ id: string; name: string }> {
    const res = await this.request('/files?fields=id,name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    const data = (await res.json()) as { id: string; name: string };
    return data;
  }

  async shareFolder(
    folderId: string,
    email: string,
    role: 'writer' | 'reader' = 'writer',
  ): Promise<string> {
    const res = await this.request(`/files/${folderId}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'user',
        role,
        emailAddress: email,
      }),
    });
    const data = (await res.json()) as { id: string };
    return data.id;
  }

  async revokePermission(folderId: string, permissionId: string): Promise<void> {
    await this.request(`/files/${folderId}/permissions/${permissionId}`, {
      method: 'DELETE',
    });
  }
}
