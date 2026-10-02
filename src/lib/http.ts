import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-session';
import { AppError } from '@/lib/errors';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  console.error('[api] unhandled', error);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Terjadi kesalahan server.' } },
    { status: 500 },
  );
}

type SessionUser = NonNullable<Awaited<ReturnType<typeof getUserFromRequest>>>;

export function withAuth<Ctx = unknown>(
  handler: (user: SessionUser, req: NextRequest, ctx: Ctx) => Promise<Response>,
) {
  return async (req: NextRequest, ctx?: Ctx): Promise<Response> => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) throw new AppError('UNAUTHORIZED', 'Silakan login terlebih dahulu.', 401);
      return await handler(user, req, ctx as Ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
