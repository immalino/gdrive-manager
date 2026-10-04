export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'TOKEN_EXPIRED'
  | 'ACCOUNT_DISCONNECTED'
  | 'QUOTA_EXCEEDED'
  | 'PERMISSION_DENIED'
  | 'UPLOAD_FAILED'
  | 'UPLOAD_DISABLED'
  | 'GOOGLE_UNAVAILABLE'
  | 'INTERNAL';

export class AppError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
