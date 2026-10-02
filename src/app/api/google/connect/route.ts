import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-session';
import { buildAuthUrl } from '@/lib/google/oauth';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.redirect(new URL('/sign-in', req.url));
  const state = JSON.stringify({ nonce: randomBytes(16).toString('hex'), userId: user.id });
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
