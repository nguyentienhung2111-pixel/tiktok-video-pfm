'use client';

import React from 'react';
import { Calendar, Share, User } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  userName?: string;
}

export default function DashboardHeader({ title, subtitle, userName = "Nguyễn Tiến Hưng" }: DashboardHeaderProps) {
  return (
    <header className="flex justify-between items-center px-12 py-6 bg-[rgba(11,14,20,0.8)] backdrop-blur-md sticky top-0 z-90 border-bottom border-[#30363d]">
      <div className="header-title">
        <h1 className="text-2xl font-bold">{title} 👋</h1>
        {subtitle && (
          <p className="text-sm text-[#94a3b8] mt-1">{subtitle}</p>
        )}
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-[#30363d] rounded-full text-sm font-semibold hover:bg-white/5 transition-colors">
            <Calendar className="w-4 h-4" />
            7 ngày qua
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white rounded-full text-sm font-semibold hover:shadow-lg transition-all">
            <Share className="w-4 h-4" />
            Xuất báo cáo
          </button>
        </div>
        
        <div className="flex items-center gap-3 pl-6 border-l border-[#30363d]">
          <div className="w-8 h-8 bg-[#4c1d95] rounded-full flex items-center justify-center text-sm font-bold">
            {userName.split(' ').map(n => n[0]).join('').slice(-2).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{userName}</span>
        </div>
      </div>
    </header>
  );
}
