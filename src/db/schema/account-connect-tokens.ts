import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { user } from './auth';
import { googleAccounts } from './google-accounts';

export const accountConnectTokens = pgTable(
  'account_connect_tokens',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    token: text('token').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['pending', 'completed', 'expired'] })
      .notNull()
      .default('pending'),
    connectedAccountId: text('connected_account_id').references(() => googleAccounts.id, {
      onDelete: 'set null',
    }),
    connectedEmail: text('connected_email'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('account_connect_tokens_token_idx').on(t.token)],
);

export type AccountConnectToken = typeof accountConnectTokens.$inferSelect;

