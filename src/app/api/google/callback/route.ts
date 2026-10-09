import { and, eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/db';
import { accountConnectTokens, googleAccounts, sharedRoots } from '@/db/schema';
import { logActivity } from '@/lib/activity';
import { encryptSecret } from '@/lib/encryption';
import { exchangeCode, fetchUserInfo } from '@/lib/google/oauth';
import { shareRootToAccount } from '@/lib/shared-drive/permissions';

function failRedirect(req: NextRequest, error: string, connectToken?: string): NextResponse {
  const dest = connectToken
    ? `/connect/${connectToken}?error=${error}`
    : `/dashboard/accounts?error=${error}`;
  const res = NextResponse.redirect(new URL(dest, req.url));
  res.cookies.delete('g_oauth_state');
  return res;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const googleError = url.searchParams.get('error');

  let parsedState: { userId?: string; returnTo?: string; connectToken?: string } | null = null;
  if (state) {
    try {
      parsedState = JSON.parse(state);
    } catch {
      parsedState = null;
    }
  }

  const connectToken = parsedState?.connectToken;

  if (googleError) {
    return failRedirect(
      req,
      googleError === 'access_denied' ? 'access_denied' : 'google_error',
      connectToken,
    );
  }

  if (!code || !state || !parsedState) {
    return failRedirect(req, 'invalid_state', connectToken);
  }

  const saved = req.cookies.get('g_oauth_state')?.value;
  let tokenRow: typeof accountConnectTokens.$inferSelect | undefined;

  if (connectToken) {
    const found = await db.query.accountConnectTokens.findFirst({
      where: eq(accountConnectTokens.token, connectToken),
    });
    if (!found || found.status !== 'pending' || found.expiresAt.getTime() <= Date.now()) {
      return failRedirect(req, 'invalid_state', connectToken);
    }
    if (saved && saved !== state) {
      return failRedirect(req, 'invalid_state', connectToken);
    }
    tokenRow = found;
  } else {
    if (!saved || state !== saved) {
      return failRedirect(req, 'invalid_state');
    }
  }

  const userId = tokenRow ? tokenRow.userId : parsedState.userId;
  if (!userId) {
    return failRedirect(req, 'invalid_state', connectToken);
  }
  const returnTo = parsedState.returnTo;

  let tokens: Awaited<ReturnType<typeof exchangeCode>>;
  let info: Awaited<ReturnType<typeof fetchUserInfo>>;
  try {
    tokens = await exchangeCode(code);
    info = await fetchUserInfo(tokens.access_token);
  } catch (error) {
    console.error(
      '[google-callback] exchange gagal:',
      error instanceof Error ? error.message : error,
    );
    return failRedirect(req, 'exchange_failed', connectToken);
  }

  const existingPrimary = await db.query.googleAccounts.findFirst({
    where: and(eq(googleAccounts.userId, userId), eq(googleAccounts.role, 'primary')),
  });

  const values: Omit<typeof googleAccounts.$inferInsert, 'refreshTokenEncrypted'> = {
    userId,
    googleAccountId: info.sub,
    email: info.email,
    name: info.name ?? null,
    picture: info.picture ?? null,
    accessToken: encryptSecret(tokens.access_token),
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    status: 'connected',
    role: !existingPrimary ? 'primary' : 'pool',
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
      return failRedirect(req, 'no_refresh_token', connectToken);
    }
    [row] = await db
      .update(googleAccounts)
      .set(values)
      .where(eq(googleAccounts.id, existing.id))
      .returning();
  }

  try {
    const { syncQuota } = await import('@/lib/quota');
    await syncQuota(row!);
  } catch (error) {
    console.warn('[callback] sync quota gagal', error instanceof Error ? error.message : error);
  }

  await logActivity({
    userId,
    googleAccountId: row!.id,
    action: 'account.connect',
    metadata: {
      email: row!.email,
      role: row!.role,
      viaConnectToken: !!connectToken,
    },
  });

  if (tokenRow) {
    await db
      .update(accountConnectTokens)
      .set({
        status: 'completed',
        connectedAccountId: row!.id,
        connectedEmail: row!.email,
        updatedAt: new Date(),
      })
      .where(eq(accountConnectTokens.id, tokenRow.id));
  }

  let hasSharedRoot = false;
  try {
    const sharedRoot = await db.query.sharedRoots.findFirst({
      where: eq(sharedRoots.userId, userId),
    });
    hasSharedRoot = !!sharedRoot;

    // Hanya auto-share jika shared root sudah ada dan akun ini adalah akun pool
    if (sharedRoot && sharedRoot.primaryAccountId !== row!.id) {
      const primaryAccount = await db.query.googleAccounts.findFirst({
        where: and(
          eq(googleAccounts.id, sharedRoot.primaryAccountId),
          eq(googleAccounts.userId, userId),
        ),
      });

      if (primaryAccount) {
        const permission = await shareRootToAccount(
          sharedRoot.id,
          sharedRoot.driveFolderId,
          primaryAccount,
          row!,
        );
        await logActivity({
          userId,
          googleAccountId: row!.id,
          action: 'setup.share',
          metadata: {
            folderId: sharedRoot.driveFolderId,
            permissionId: permission.drivePermissionId,
            poolEmail: row!.email,
            autoShared: true,
          },
        });
      }
    }
  } catch (shareErr) {
    console.warn(
      '[callback] auto-share root ke akun baru gagal',
      shareErr instanceof Error ? shareErr.message : shareErr,
    );
  }

  if (connectToken) {
    const res = NextResponse.redirect(
      new URL(`/connect/success?email=${encodeURIComponent(row!.email)}`, req.url),
    );
    res.cookies.delete('g_oauth_state');
    return res;
  }

  const defaultDestination = hasSharedRoot
    ? `/dashboard/accounts?connected=${row!.id}`
    : `/dashboard/setup`;
  const targetUrl = returnTo
    ? new URL(
        returnTo.includes('?')
          ? `${returnTo}&connected=${row!.id}`
          : `${returnTo}?connected=${row!.id}`,
        req.url,
      )
    : new URL(defaultDestination, req.url);

  const res = NextResponse.redirect(targetUrl);
  res.cookies.delete('g_oauth_state');
  return res;
}
