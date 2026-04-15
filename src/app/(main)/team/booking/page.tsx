'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const TeamPage = dynamic(() => import('@/components/TeamPage'), {
  ssr: false,
  loading: () => <div className="p-20 text-center animate-pulse text-[#94a3b8]">Đang khởi tạo trang team...</div>
});

export default function BookingTeamPage() {
  return (
    <TeamPage 
      title="Team Booking / Affiliate" 
      subtitle="Quản lý hiệu suất hợp tác với KOC." 
      sourceType="koc" 
    />
  );
}
