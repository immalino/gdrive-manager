import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { getUser } from '@/lib/auth-session';
import { getSetupStatus } from '@/lib/shared-drive/setup';

const requiredEnvVars = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'APP_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'TOKEN_ENCRYPTION_KEY',
];

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect('/sign-in');

  const setupStatus = await getSetupStatus(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Konfigurasi aplikasi.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Folder Root Virtual Drive</CardTitle>
          <CardDescription>
            Folder Google Drive yang digunakan sebagai root penyimpanan pool bersama.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Folder Root Aktif</span>
              <p className="font-medium">{setupStatus.sharedRoot?.folderName || 'Belum diatur'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Folder ID Google Drive</span>
              <p className="font-mono text-xs truncate">
                {setupStatus.sharedRoot?.driveFolderId || '-'}
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard/setup"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Ubah atau Atur Ulang Folder Root
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Akun aplikasi yang sedang login.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="truncate text-sm font-medium">{user.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="truncate text-sm font-medium">{user.email}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs text-muted-foreground">User ID</dt>
              <dd className="truncate font-mono text-sm">{user.id}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Harus diisi di file .env (lihat .env.example).</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {requiredEnvVars.map((name) => (
              <li key={name} className="rounded-md border border-border px-3 py-2 text-sm">
                <code>{name}</code>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
