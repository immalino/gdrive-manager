import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { AppError } from '@/lib/errors';

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export async function getUser(): Promise<Session['user'] | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function getUserFromRequest(req: NextRequest): Promise<Session['user'] | null> {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export async function requireUser(): Promise<Session['user']> {
  const user = await getUser();
  if (!user) throw new AppError('UNAUTHORIZED', 'Silakan login terlebih dahulu.', 401);
  return user;
}
