import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { env } from '@/lib/env';
import { syncGoogleAccountFromAuth } from '@/lib/google/auth-sync';

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.BETTER_AUTH_URL],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: { enabled: false },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      scope: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive'],
      accessType: 'offline',
      prompt: 'consent',
    },
  },
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          if (account.providerId === 'google') {
            await syncGoogleAccountFromAuth(account);
          }
        },
      },
      update: {
        after: async (account) => {
          if (account.providerId === 'google') {
            await syncGoogleAccountFromAuth(account);
          }
        },
      },
    },
  },
});
