import { bigint, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { googleAccounts } from './google-accounts';

export const storageSnapshots = pgTable('storage_snapshots', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  googleAccountId: text('google_account_id')
    .notNull()
    .references(() => googleAccounts.id, { onDelete: 'cascade' }),
  totalBytes: bigint('total_bytes', { mode: 'number' }),
  usedBytes: bigint('used_bytes', { mode: 'number' }).notNull().default(0),
  freeBytes: bigint('free_bytes', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type StorageSnapshot = typeof storageSnapshots.$inferSelect;
