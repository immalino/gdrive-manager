export interface DriveQuota {
  totalBytes: number | null;
  usedBytes: number;
  freeBytes: number | null;
}

export interface DriveFileDto {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  modifiedAt: string | null;
  parentId: string | null;
  webViewLink: string | null;
  accountId: string;
  accountEmail: string;
  ownerEmail?: string | null;
}
