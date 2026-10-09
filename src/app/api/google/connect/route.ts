import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/db';
import { accountConnectTokens } from '@/db/schema';
import { getUserFromRequest } from '@/lib/auth-session';
import { buildAuthUrl } from '@/lib/google/oauth';

export async function GET(req: NextRequest) {
  const tokenParam = req.nextUrl.searchParams.get('token');

  if (tokenParam) {
    const tokenRow = await db.query.accountConnectTokens.findFirst({
      where: eq(accountConnectTokens.token, tokenParam),
    });

    if (!tokenRow || tokenRow.status !== 'pending' || tokenRow.expiresAt.getTime() <= Date.now()) {
      return NextResponse.redirect(new URL(`/connect/${tokenParam}?error=invalid`, req.url));
    }

    const state = JSON.stringify({
      nonce: randomBytes(16).toString('hex'),
      connectToken: tokenParam,
      userId: tokenRow.userId,
    });

    const res = NextResponse.redirect(buildAuthUrl(state));
    res.cookies.set('g_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600,
      path: '/',
    });
    return res;
  }

  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.redirect(new URL('/sign-in', req.url));
  const returnTo = req.nextUrl.searchParams.get('redirect');
  const state = JSON.stringify({
    nonce: randomBytes(16).toString('hex'),
    userId: user.id,
    ...(returnTo ? { returnTo } : {}),
  });
  const res = NextResponse.redirect(buildAuthUrl(state));
  res.cookies.set('g_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });
  return res;
}
