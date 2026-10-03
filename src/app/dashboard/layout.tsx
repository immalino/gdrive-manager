import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { UploadQueueDrawer } from '@/components/upload/upload-queue-drawer';
import { getUser } from '@/lib/auth-session';
import { getSetupStatus } from '@/lib/shared-drive/setup';
import { SetupGuard } from '@/components/setup/setup-guard';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/sign-in');

  const setupStatus = await getSetupStatus(user.id);
  const headerList = await headers();
  const pathname = headerList.get('x-pathname');

  if (!setupStatus.isSetupDone && pathname && pathname !== '/dashboard/setup') {
    redirect('/dashboard/setup');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <SetupGuard isSetupDone={setupStatus.isSetupDone} />
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        <Header user={{ name: user.name, email: user.email }} />
        <main className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col">{children}</main>
      </div>
      <UploadQueueDrawer />
    </div>
  );
}
