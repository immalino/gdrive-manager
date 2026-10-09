import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SuccessPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function ConnectSuccessPage({ searchParams }: SuccessPageProps) {
  const { email } = await searchParams;

  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader className="space-y-3 pb-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <CheckCircle2 className="size-7" />
        </div>
        <CardTitle className="text-xl">Berhasil Terhubung!</CardTitle>
        <CardDescription>
          Akun Google Drive Anda telah berhasil ditambahkan sebagai pool storage.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {email && (
          <div className="rounded-md border bg-muted/50 p-3 text-sm font-medium">{email}</div>
        )}
        <p className="text-xs text-muted-foreground">
          Otorisasi selesai. Anda sekarang dapat menutup tab atau jendela browser ini.
        </p>
      </CardContent>
    </Card>
  );
}
