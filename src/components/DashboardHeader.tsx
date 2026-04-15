'use client';

import React from 'react';
import { useUser } from '@/components/user-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function DashboardHeader({ title, subtitle, children }: DashboardHeaderProps) {
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="flex flex-col">
        <h1 className="text-lg font-bold truncate max-w-[400px]">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground truncate max-w-[400px]">{subtitle}</p>}
      </div>
      
      <div className="flex items-center gap-4">
        {children}
        
        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium">{user?.display_name || 'Admin DECOCO'}</span>
            <span className="text-[11px] text-muted-foreground uppercase tracking-tight">
              {user?.role === 'admin' ? 'Quản trị viên' : user?.role || 'Nhân viên'}
            </span>
          </div>
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={`https://avatar.vercel.sh/${user?.display_name || 'admin'}.png`} />
            <AvatarFallback>{user?.display_name?.substring(0, 2).toUpperCase() || 'AD'}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
