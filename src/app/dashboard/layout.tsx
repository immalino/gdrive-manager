import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { UploadQueueDrawer } from '@/components/upload/upload-queue-drawer';
import { getUser } from '@/lib/auth-session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/sign-in');

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header user={{ name: user.name, email: user.email }} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <UploadQueueDrawer />
    </div>
  );
}
