import { Card, CardContent } from '@/components/ui/card';

export default function FilesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Files</h1>
        <p className="text-sm text-muted-foreground">
          Jelajahi file dari seluruh akun Google Drive.
        </p>
      </div>
      <Card>
        <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Belum ada file. Hubungkan akun Google di halaman Accounts.
        </CardContent>
      </Card>
    </div>
  );
}
