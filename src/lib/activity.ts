import { db } from '@/db';
import { activityLogs } from '@/db/schema';

export type ActivityAction =
  | 'account.connect'
  | 'account.disconnect'
  | 'quota.sync'
  | 'file.upload'
  | 'file.download'
  | 'file.delete'
  | 'folder.create'
  | 'file.rename'
  | 'file.move'
  | 'file.copy';

export async function logActivity(input: {
  userId: string;
  googleAccountId?: string | null;
  action: ActivityAction;
  fileId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      userId: input.userId,
      googleAccountId: input.googleAccountId ?? null,
      action: input.action,
      fileId: input.fileId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (error) {
    console.warn('[activity] gagal menulis log', error instanceof Error ? error.message : error);
  }
}
