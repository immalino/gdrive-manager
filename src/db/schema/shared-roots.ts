import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { user } from './auth';
import { googleAccounts } from './google-accounts';

export const sharedRoots = pgTable('shared_roots', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  primaryAccountId: text('primary_account_id')
    .notNull()
    .references(() => googleAccounts.id, { onDelete: 'cascade' }),
  driveFolderId: text('drive_folder_id').notNull(),
  folderName: text('folder_name').notNull().default('GDrive Pool'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SharedRoot = typeof sharedRoots.$inferSelect;
export type NewSharedRoot = typeof sharedRoots.$inferInsert;
