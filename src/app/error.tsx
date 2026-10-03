'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Terjadi kesalahan pada aplikasi</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-3">
            <p>{error.message || 'Terjadi kesalahan sistem yang tidak terduga.'}</p>
            <div>
              <Button variant="outline" size="sm" onClick={() => reset()} className="gap-2">
                <RotateCcw className="size-4" />
                Coba lagi
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
