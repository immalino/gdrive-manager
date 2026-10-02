function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Env ${name} belum di-set. Cek .env dan .env.example.`);
  return value;
}

export const env = {
  get DATABASE_URL() {
    return required('DATABASE_URL');
  },
  get BETTER_AUTH_SECRET() {
    return required('BETTER_AUTH_SECRET');
  },
  get BETTER_AUTH_URL() {
    return required('BETTER_AUTH_URL');
  },
  get APP_URL() {
    return process.env.APP_URL ?? 'http://localhost:3000';
  },
  get GOOGLE_CLIENT_ID() {
    return process.env.GOOGLE_CLIENT_ID ?? '';
  },
  get GOOGLE_CLIENT_SECRET() {
    return process.env.GOOGLE_CLIENT_SECRET ?? '';
  },
  get GOOGLE_REDIRECT_URI() {
    return (
      process.env.GOOGLE_REDIRECT_URI ??
      `${process.env.APP_URL ?? 'http://localhost:3000'}/api/google/callback`
    );
  },
  get TOKEN_ENCRYPTION_KEY() {
    return required('TOKEN_ENCRYPTION_KEY');
  },
};
