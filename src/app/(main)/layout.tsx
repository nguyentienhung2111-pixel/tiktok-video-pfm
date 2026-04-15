'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace('/login');
        return;
      }

      // Lấy profile user
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, role')
        .eq('id', session.user.id)
        .single();

      setUser(profile || { 
        display_name: session.user.email?.split('@')[0] || 'User', 
        role: 'staff_content' 
      });
      setLoading(false);
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} />
      <main className="ml-60 min-h-screen">
        {children}
      </main>
    </div>
  );
}
