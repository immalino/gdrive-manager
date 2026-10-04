import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';

export const rateLimits = pgTable(
  'rate_limits',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    key: text('key').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('rate_limits_key_ts_idx').on(t.key, t.timestamp)],
);
