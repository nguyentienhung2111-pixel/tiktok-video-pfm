'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b5cf6]"></div>
    </div>
  )
});

export default function DashboardPage() {
  return <Dashboard />;
}
