import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleAccounts } from '@/db/schema';
import { ok, withAuth } from '@/lib/http';

export const GET = withAuth(async (user) => {
  const rows = await db
    .select({
      id: googleAccounts.id,
      email: googleAccounts.email,
      name: googleAccounts.name,
      picture: googleAccounts.picture,
      status: googleAccounts.status,
      role: googleAccounts.role,
      createdAt: googleAccounts.createdAt,
    })
    .from(googleAccounts)
    .where(eq(googleAccounts.userId, user.id))
    .orderBy(desc(googleAccounts.createdAt));
  return ok({ accounts: rows });
});
