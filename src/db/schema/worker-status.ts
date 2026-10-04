import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const workerStatus = pgTable('worker_status', {
  id: text('id').primaryKey().default('worker-main'),
  service: text('service').notNull().default('background-worker'),
  lastHeartbeat: timestamp('last_heartbeat', { withTimezone: true }).notNull().defaultNow(),
  status: text('status', { enum: ['active', 'stale', 'stopped'] })
    .notNull()
    .default('active'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
