export function isTokenExpired(expiresAt: Date, status: string): boolean {
  return status === 'expired' || expiresAt.getTime() <= Date.now();
}
