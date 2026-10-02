import { and, eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/db';
import { googleAccounts } from '@/db/schema';
import { encryptSecret } from '@/lib/encryption';
import { exchangeCode, fetchUserInfo } from '@/lib/google/oauth';

function failRedirect(req: NextRequest, error: string): NextResponse {
  const res = NextResponse.redirect(new URL(`/dashboard/accounts?error=${error}`, req.url));
  res.cookies.delete('g_oauth_state');
  return res;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const saved = req.cookies.get('g_oauth_state')?.value;

  if (!code || !state || !saved || state !== saved) {
    return failRedirect(req, 'invalid_state');
  }

  let userId: string;
  try {
    userId = (JSON.parse(state) as { userId: string }).userId;
  } catch {
    return failRedirect(req, 'invalid_state');
  }

  let tokens: Awaited<ReturnType<typeof exchangeCode>>;
  let info: Awaited<ReturnType<typeof fetchUserInfo>>;
  try {
    tokens = await exchangeCode(code);
    info = await fetchUserInfo(tokens.access_token);
  } catch (error) {
    console.error('[google-callback] exchange gagal:', error instanceof Error ? error.message : error);
    return failRedirect(req, 'exchange_failed');
  }

  const values: Omit<typeof googleAccounts.$inferInsert, 'refreshTokenEncrypted'> = {
    userId,
    googleAccountId: info.sub,
    email: info.email,
    name: info.name ?? null,
    picture: info.picture ?? null,
    accessToken: encryptSecret(tokens.access_token),
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    status: 'connected',
    updatedAt: new Date(),
  };

  let row;
  if (tokens.refresh_token) {
    const refreshTokenEncrypted = encryptSecret(tokens.refresh_token);
    [row] = await db
      .insert(googleAccounts)
      .values({ ...values, refreshTokenEncrypted })
      .onConflictDoUpdate({
        target: [googleAccounts.userId, googleAccounts.googleAccountId],
        set: { ...values, refreshTokenEncrypted },
      })
      .returning();
  } else {
    // Google hanya melewatkan refresh_token pada konsent ulang; pertahankan
    // refresh token lama (insert pertama wajib punya — prompt=consent).
    const [existing] = await db
      .select({ id: googleAccounts.id })
      .from(googleAccounts)
      .where(and(eq(googleAccounts.userId, userId), eq(googleAccounts.googleAccountId, info.sub)));
    if (!existing) {
      return failRedirect(req, 'no_refresh_token');
    }
    [row] = await db.update(googleAccounts).set(values).where(eq(googleAccounts.id, existing.id)).returning();
  }

  const res = NextResponse.redirect(new URL(`/dashboard/accounts?connected=${row!.id}`, req.url));
  res.cookies.delete('g_oauth_state');
  return res;
}
