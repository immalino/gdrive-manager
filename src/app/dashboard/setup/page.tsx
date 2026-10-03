import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth-session';
import { getSetupStatus } from '@/lib/shared-drive/setup';
import { SetupWizard } from '@/components/setup/setup-wizard';

export default async function SetupPage() {
  const user = await getUser();
  if (!user) redirect('/sign-in');

  const status = await getSetupStatus(user.id);
  if (status.isSetupDone) {
    redirect('/dashboard');
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-6">
      <SetupWizard />
    </div>
  );
}
