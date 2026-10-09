import { eq } from 'drizzle-orm';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { db } from '@/db';
import { accountConnectTokens } from '@/db/schema';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { isTokenExpired } from '@/lib/connect-token';

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function ConnectTokenPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { error } = await searchParams;

  const tokenRow = await db.query.accountConnectTokens.findFirst({
    where: eq(accountConnectTokens.token, token),
  });

  if (!tokenRow) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="size-5" />
            Tautan Tidak Valid
          </CardTitle>
          <CardDescription>
            Tautan yang Anda tuju tidak ditemukan atau salah. Pastikan Anda menyalin tautan dengan
            lengkap.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (tokenRow.status === 'completed') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-emerald-500 flex items-center gap-2">
            <CheckCircle2 className="size-5" />
            Tautan Sudah Digunakan
          </CardTitle>
          <CardDescription>
            Tautan ini telah berhasil digunakan untuk menghubungkan akun{' '}
            <strong className="text-foreground">{tokenRow.connectedEmail ?? 'Google'}</strong>.
            Tautan sekali pakai tidak dapat digunakan kembali.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const expired = isTokenExpired(tokenRow.expiresAt, tokenRow.status);
  if (expired) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-amber-500 flex items-center gap-2">
            <Clock className="size-5" />
            Tautan Kadaluarsa
          </CardTitle>
          <CardDescription>
            Masa aktif tautan ini telah habis (kedaluwarsa pada {formatDateTime(tokenRow.expiresAt)}
            ). Silakan minta tautan baru melalui dashboard akun.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const errorMessages: Record<string, string> = {
    access_denied: 'Otorisasi dibatalkan atau akun Google tidak memiliki akses.',
    exchange_failed: 'Gagal bertukar token otorisasi dengan Google. Silakan coba lagi.',
    no_refresh_token:
      'Google tidak memberikan refresh token. Pastikan mencentang semua izin yang diminta.',
    invalid: 'Sesi otorisasi tidak valid. Silakan coba lagi.',
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            Pool Storage
          </span>
        </div>
        <CardTitle className="text-xl">Hubungkan Akun Google Drive</CardTitle>
        <CardDescription>
          Anda sedang menghubungkan akun Google ini sebagai pool storage untuk manajemen file.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Gagal Menghubungkan</AlertTitle>
            <AlertDescription>
              {errorMessages[error] ?? `Terjadi kesalahan: ${error}`}
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2.5 text-foreground">
            <ShieldCheck className="size-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-xs">Aman & Terenkripsi</p>
              <p className="text-xs text-muted-foreground">
                Hanya folder khusus yang diakses untuk menyimpan chunk data terenkripsi.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 text-foreground pt-1">
            <Clock className="size-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-xs">Masa Berlaku Tautan</p>
              <p className="text-xs text-muted-foreground">
                Tautan berlaku hingga {formatDateTime(tokenRow.expiresAt)}.
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          render={<a href={`/api/google/connect?token=${encodeURIComponent(token)}`} />}
          size="lg"
          className="w-full gap-2"
        >
          Lanjutkan dengan Google
          <ArrowRight className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
