import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Konfigurasi aplikasi.</p>
      </div>
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
