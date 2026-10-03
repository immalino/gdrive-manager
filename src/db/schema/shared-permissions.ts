import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import { sharedRoots } from './shared-roots';
import { googleAccounts } from './google-accounts';

export const sharedPermissions = pgTable(
  'shared_permissions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    sharedRootId: text('shared_root_id')
      .notNull()
      .references(() => sharedRoots.id, { onDelete: 'cascade' }),
    googleAccountId: text('google_account_id')
      .notNull()
      .references(() => googleAccounts.id, { onDelete: 'cascade' }),
    drivePermissionId: text('drive_permission_id').notNull(),
    status: text('status', { enum: ['active', 'pending', 'revoked'] })
      .notNull()
      .default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('shared_permissions_root_idx').on(t.sharedRootId)],
);

export type SharedPermission = typeof sharedPermissions.$inferSelect;
export type NewSharedPermission = typeof sharedPermissions.$inferInsert;
