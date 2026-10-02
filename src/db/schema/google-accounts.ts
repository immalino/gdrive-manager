import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { user } from './auth';

export const googleAccounts = pgTable(
  'google_accounts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    googleAccountId: text('google_account_id').notNull(),
    email: text('email').notNull(),
    name: text('name'),
    picture: text('picture'),
    accessToken: text('access_token').notNull(),
    refreshTokenEncrypted: text('refresh_token_encrypted').notNull(),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    status: text('status', { enum: ['connected', 'reconnect_required', 'error'] })
      .notNull()
      .default('connected'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('google_accounts_user_ga_uq').on(t.userId, t.googleAccountId)],
);

export type GoogleAccount = typeof googleAccounts.$inferSelect;
