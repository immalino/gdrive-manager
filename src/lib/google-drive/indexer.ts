import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { driveFiles, type GoogleAccount } from '@/db/schema';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { classifyMime } from '@/lib/files/mime';

const MAX_PAGES = 20;
const PAGE_SIZE = 100;

export async function indexAccountFiles(account: GoogleAccount): Promise<number> {
  const service = await GoogleDriveService.forAccount(account);
  let pageToken: string | undefined;
  let indexed = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await service.listFiles({
      q: 'trashed = false',
      pageSize: PAGE_SIZE,
      pageToken,
      orderBy: 'modifiedTime desc',
    });
    if (result.files.length === 0) break;

    await db
      .insert(driveFiles)
      .values(
        result.files.map((f) => ({
          googleAccountId: account.id,
          driveFileId: f.id,
          name: f.name,
          mimeType: f.mimeType,
          kind: classifyMime(f.mimeType),
          sizeBytes: f.sizeBytes,
          modifiedAt: f.modifiedAt ? new Date(f.modifiedAt) : null,
          parentId: f.parentId,
          indexedAt: new Date(),
        })),
      )
      .onConflictDoUpdate({
        target: [driveFiles.googleAccountId, driveFiles.driveFileId],
        set: {
          name: sql`excluded.name`,
          mimeType: sql`excluded.mime_type`,
          kind: sql`excluded.kind`,
          sizeBytes: sql`excluded.size_bytes`,
          modifiedAt: sql`excluded.modified_at`,
          parentId: sql`excluded.parent_id`,
          indexedAt: sql`excluded.indexed_at`,
        },
      });

    indexed += result.files.length;
    if (!result.nextPageToken) break;
    pageToken = result.nextPageToken;
  }

  return indexed;
}
