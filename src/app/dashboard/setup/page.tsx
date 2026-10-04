import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth-session';
import { getSetupStatus, initSharedRoot } from '@/lib/shared-drive/setup';
import { SetupWizard } from '@/components/setup/setup-wizard';

export default async function SetupPage() {
  const user = await getUser();
  if (!user) redirect('/sign-in');

  const status = await getSetupStatus(user.id);
  if (status.isSetupDone) {
    redirect('/dashboard');
  }

  // Self-heal: Jika akun utama sudah ada tetapi shared root belum terinisialisasi,
  // jalankan inisialisasi otomatis dan langsung redirect ke dashboard.
  if (status.primaryAccount) {
    try {
      await initSharedRoot({
        userId: user.id,
        primaryAccountId: status.primaryAccount.id,
      });
      redirect('/dashboard');
    } catch (err) {
      console.warn('[SetupPage] Auto-init fallback failed, rendering wizard:', err);
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-6">
      <SetupWizard />
    </div>
  );
}
