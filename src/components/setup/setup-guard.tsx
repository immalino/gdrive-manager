'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function SetupGuard({ isSetupDone }: { isSetupDone: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isSetupDone && pathname && pathname !== '/dashboard/setup') {
      router.replace('/dashboard/setup');
    }
  }, [isSetupDone, pathname, router]);

  return null;
}
