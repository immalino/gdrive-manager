import type { GoogleAccount } from '@/db/schema';
import { AppError } from '@/lib/errors';

export function mapGoogleError(res: Response, account: GoogleAccount): AppError {
  if (res.status === 401)
    return new AppError('TOKEN_EXPIRED', `Token akun ${account.email} tidak valid.`, 401);
  if (res.status === 403)
    return new AppError('PERMISSION_DENIED', `Izin ditolak untuk ${account.email}.`, 403);
  if (res.status === 404) return new AppError('NOT_FOUND', 'File tidak ditemukan.', 404);
  if (res.status === 429)
    return new AppError(
      'RATE_LIMITED',
      'Terlalu banyak permintaan ke Google. Coba lagi nanti.',
      429,
    );
  return new AppError('GOOGLE_UNAVAILABLE', 'Google Drive API tidak tersedia.', 502);
}
