import { bigint, index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { googleAccounts } from './google-accounts';

export const driveFiles = pgTable(
  'drive_files',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    googleAccountId: text('google_account_id')
      .notNull()
      .references(() => googleAccounts.id, { onDelete: 'cascade' }),
    driveFileId: text('drive_file_id').notNull(),
    name: text('name').notNull(),
    mimeType: text('mime_type').notNull(),
    kind: text('kind', { enum: ['document', 'image', 'video', 'archive', 'other', 'folder'] })
      .notNull()
      .default('other'),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    modifiedAt: timestamp('modified_at', { withTimezone: true }),
    parentId: text('parent_id'),
    indexedAt: timestamp('indexed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('drive_files_account_file_uq').on(t.googleAccountId, t.driveFileId),
    index('drive_files_kind_idx').on(t.kind),
  ],
);

export type DriveFileRecord = typeof driveFiles.$inferSelect;
