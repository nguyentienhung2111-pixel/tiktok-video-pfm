'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, Tag, BookOpen, Upload, Package,
  Tags, Users, Settings, LogOut, Tv, UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { useUser } from '@/components/user-context';

const mainMenu = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/team/content', label: 'Thương hiệu', icon: Tv },
  { href: '/team/booking', label: 'KOC / Affiliate', icon: UserCheck },
  { href: '/guideline', label: 'Tag Guideline', icon: BookOpen },
];

const adminMenu = [
  { href: '/admin/upload', label: 'Upload dữ liệu', icon: Upload },
  { href: '/admin/products', label: 'Sản phẩm', icon: Package },
  { href: '/admin/tags', label: 'Quản lý Tag', icon: Tags },
  { href: '/admin/accounts', label: 'Tài khoản', icon: Users },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const initials = user?.display_name
    ? user.display_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const roleLabel = {
    admin: 'Quản trị viên',
    leader_content: 'Leader Content',
    leader_booking: 'Leader Booking',
    staff_content: 'Nhân viên Content',
    staff_booking: 'Nhân viên Booking',
  }[user?.role || 'staff_content'] || 'Nhân viên';

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Tv className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">DECOCO</p>
          <p className="text-[11px] text-muted-foreground">Analytics</p>
        </div>
      </div>

      <Separator />

      {/* Menu chính */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Menu chính
        </p>
        <div className="space-y-1">
          {mainMenu.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quản trị
        </p>
        <div className="space-y-1">
          {adminMenu.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <Separator />

      {/* User info + Logout */}
      <div className="px-3 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.display_name || 'User'}
            </p>
            <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
            title="Đăng xuất"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
