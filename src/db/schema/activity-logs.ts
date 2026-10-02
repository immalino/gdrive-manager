import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { user } from './auth';
import { googleAccounts } from './google-accounts';

export const activityLogs = pgTable('activity_logs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  googleAccountId: text('google_account_id').references(() => googleAccounts.id, {
    onDelete: 'set null',
  }),
  action: text('action').notNull(),
  fileId: text('file_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
