'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Terjadi kesalahan pada dashboard</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3">
          <p>
            {error.message || 'Terjadi kesalahan yang tidak terduga saat memuat halaman dashboard.'}
          </p>
          <div>
            <Button variant="outline" size="sm" onClick={() => reset()} className="gap-2">
              <RotateCcw className="size-4" />
              Coba lagi
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
