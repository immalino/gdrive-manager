import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hubungkan Akun Google Drive | GDrive Manager',
  description: 'Hubungkan akun Google Drive sebagai pool storage',
};

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4 text-foreground">
      <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <span aria-hidden="true">☁</span> GDrive Manager
      </div>
      {children}
    </main>
  );
}

