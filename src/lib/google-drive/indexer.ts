import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { driveFiles, type GoogleAccount } from '@/db/schema';
import { GoogleDriveService } from '@/lib/google-drive/service';
import { classifyMime } from '@/lib/files/mime';

const MAX_PAGES = 20;
const PAGE_SIZE = 100;

export async function indexAccountFiles(
  account: GoogleAccount,
  rootFolderId?: string,
): Promise<number> {
  const service = await GoogleDriveService.forAccount(account);
  let indexed = 0;

  let targetRootId = rootFolderId;
  if (!targetRootId && db.query?.sharedRoots?.findFirst) {
    try {
      const { sharedRoots } = await import('@/db/schema');
      const { eq } = await import('drizzle-orm');
      const root = await db.query.sharedRoots.findFirst({
        where: eq(sharedRoots.userId, account.userId),
      });
      targetRootId = root?.driveFolderId;
    } catch {
      // ignore
    }
  }

  const emailToAccountId = new Map<string, string>();
  if (db.query?.googleAccounts?.findMany) {
    try {
      const { googleAccounts } = await import('@/db/schema');
      const { eq } = await import('drizzle-orm');
      const userAccounts = await db.query.googleAccounts.findMany({
        where: eq(googleAccounts.userId, account.userId),
      });
      for (const a of userAccounts) {
        emailToAccountId.set(a.email.toLowerCase(), a.id);
      }
    } catch {
      // ignore
    }
  }

  if (targetRootId) {
    const folderQueue: string[] = [targetRootId];
    const visitedFolders = new Set<string>();

    while (folderQueue.length > 0) {
      const currentFolderId = folderQueue.shift()!;
      if (visitedFolders.has(currentFolderId)) continue;
      visitedFolders.add(currentFolderId);

      let pageToken: string | undefined;
      for (let page = 0; page < MAX_PAGES; page++) {
        const result = await service.listFiles({
          q: `'${currentFolderId}' in parents and trashed = false`,
          pageSize: PAGE_SIZE,
          pageToken,
          orderBy: 'modifiedTime desc',
        });
        if (result.files.length === 0) break;

        for (const f of result.files) {
          if (f.mimeType === 'application/vnd.google-apps.folder') {
            folderQueue.push(f.id);
          }
        }

        await db
          .insert(driveFiles)
          .values(
            result.files.map((f) => {
              const owningAccountId =
                (f.ownerEmail && emailToAccountId.get(f.ownerEmail.toLowerCase())) || account.id;
              return {
                googleAccountId: owningAccountId,
                driveFileId: f.id,
                name: f.name,
                mimeType: f.mimeType,
                kind: classifyMime(f.mimeType),
                sizeBytes: f.sizeBytes,
                modifiedAt: f.modifiedAt ? new Date(f.modifiedAt) : null,
                parentId: f.parentId ?? currentFolderId,
                indexedAt: new Date(),
              };
            }),
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
    }
  } else {
    let pageToken: string | undefined;
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
  }

  return indexed;
}
