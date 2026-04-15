'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { supabase } from '@/lib/supabase';

const PUBLIC_PATHS = ['/login'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (isPublic) {
      setAuthChecked(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
      } else {
        setAuthChecked(true);
      }
    });

    // Lắng nghe thay đổi auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !PUBLIC_PATHS.includes(window.location.pathname)) {
        router.replace('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [isPublic, router]);

  // Trang login — render thẳng không cần sidebar
  if (isPublic) {
    return <>{children}</>;
  }

  // Chờ kiểm tra auth
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0e14]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b5cf6]" />
      </div>
    );
  }

  // Trang đã xác thực — hiển thị với sidebar
  return (
    <div className="flex min-h-screen bg-[#0b0e14]">
      <Sidebar />
      <main className="ml-[260px] flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
