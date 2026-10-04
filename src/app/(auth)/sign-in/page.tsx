'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { authClient } from '@/lib/auth-client';

function GoogleIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/dashboard',
      });
    } catch (err) {
      setLoading(false);
      setError(
        err instanceof Error ? err.message : 'Gagal menghubungkan ke Google OAuth. Coba lagi.',
      );
    }
  }

  return (
    <Card className="w-full max-w-sm border-border/60 shadow-lg">
      <CardHeader className="text-center space-y-1.5 pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">Masuk ke GDrive Manager</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Kelola dan gabungkan penyimpanan Google Drive Anda ke dalam satu virtual drive terpadu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-xs text-destructive text-center">
            {error}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full h-11 gap-3 font-medium border-border/80 hover:bg-muted/50 cursor-pointer"
          disabled={loading}
          onClick={handleGoogleSignIn}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Menghubungkan ke Google…
            </>
          ) : (
            <>
              <GoogleIcon />
              Masuk dengan Google
            </>
          )}
        </Button>
      </CardContent>
      <CardFooter className="pt-0">
        <p className="text-[11px] text-muted-foreground/80 text-center w-full leading-relaxed">
          Akun Google yang Anda gunakan untuk masuk akan otomatis menjadi{' '}
          <strong className="text-foreground/90 font-medium">Akun Utama (Primary)</strong> virtual
          drive Anda.
        </p>
      </CardFooter>
    </Card>
  );
}
