import { bigint, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { user } from './auth';
import { googleAccounts } from './google-accounts';

export const uploadJobs = pgTable('upload_jobs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  googleAccountId: text('google_account_id')
    .notNull()
    .references(() => googleAccounts.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  status: text('status', { enum: ['pending', 'uploading', 'completed', 'failed'] })
    .notNull()
    .default('pending'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export type UploadJob = typeof uploadJobs.$inferSelect;
