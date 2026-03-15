'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { Sidebar } from './layout/Sidebar';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!isLoginPage && !isAuthenticated()) {
      router.replace('/login');
    }
    setChecked(true);
  }, [pathname, router, isLoginPage]);

  if (!checked) return null;

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
