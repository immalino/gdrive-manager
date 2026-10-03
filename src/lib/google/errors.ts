import type { GoogleAccount } from '@/db/schema';
import { AppError } from '@/lib/errors';

export async function mapGoogleError(res: Response, account: GoogleAccount): Promise<AppError> {
  let reason = '';
  try {
    const body = (await res.clone().json()) as {
      error?: { message?: string; errors?: Array<{ reason?: string }> };
    };
    reason = body.error?.errors?.[0]?.reason ?? body.error?.message ?? '';
  } catch {
    reason = '';
  }

  if (res.status === 401)
    return new AppError('TOKEN_EXPIRED', `Sesi Google ${account.email} kedaluwarsa.`, 401);
  if (res.status === 403 && reason.includes('userRateLimit')) {
    return new AppError(
      'RATE_LIMITED',
      'Batas kuota Google tercapai. Coba lagi beberapa menit.',
      429,
    );
  }
  if (res.status === 403)
    return new AppError('PERMISSION_DENIED', `Izin ditolak untuk ${account.email}.`, 403);
  if (res.status === 404)
    return new AppError('NOT_FOUND', 'File tidak ditemukan (mungkin sudah dihapus).', 404);
  if (res.status === 410) return new AppError('NOT_FOUND', 'Resource sudah tidak tersedia.', 404);
  if (res.status === 429)
    return new AppError('RATE_LIMITED', 'Terlalu banyak permintaan ke Google.', 429);
  if (res.status >= 500)
    return new AppError('GOOGLE_UNAVAILABLE', 'Google Drive sedang tidak tersedia.', 502);
  return new AppError('GOOGLE_UNAVAILABLE', `Google API error ${res.status}.`, 502);
}
