import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { workerStatus } from '@/db/schema';
import { ok, withAuth } from '@/lib/http';

export const GET = withAuth(async () => {
  const [latest] = await db
    .select()
    .from(workerStatus)
    .orderBy(desc(workerStatus.lastHeartbeat))
    .limit(1);

  if (!latest) {
    return ok({
      status: 'stopped' as const,
      lastHeartbeat: null,
      elapsedSeconds: null,
      service: 'background-worker',
    });
  }

  const now = Date.now();
  const elapsedMs = now - latest.lastHeartbeat.getTime();
  const elapsedSeconds = Math.max(0, Math.round(elapsedMs / 1000));

  let status: 'active' | 'stale' | 'stopped';
  if (elapsedMs <= 60_000) {
    status = 'active';
  } else if (elapsedMs <= 180_000) {
    status = 'stale';
  } else {
    status = 'stopped';
  }

  return ok({
    status,
    lastHeartbeat: latest.lastHeartbeat.toISOString(),
    elapsedSeconds,
    service: latest.service,
  });
});
