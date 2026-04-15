'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  LayoutGrid,
  FileText,
  Users,
  BookOpen,
  UploadCloud,
  Settings,
  Sparkles,
  LogOut,
  Package,
  Tag,
  UserCog
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { label: 'MENU CHÍNH', type: 'label' },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
  { label: 'Thương hiệu', href: '/team/content', icon: FileText },
  { label: 'KOC / Affiliate', href: '/team/booking', icon: Users },
  { label: 'Tag Guideline', href: '/guideline', icon: BookOpen },
  { label: 'QUẢN TRỊ', type: 'label' },
  { label: 'Upload dữ liệu', href: '/admin/upload', icon: UploadCloud },
  { label: 'Sản phẩm', href: '/admin/products', icon: Package },
  { label: 'Quản lý Tag', href: '/admin/tags', icon: Tag },
  { label: 'Tài khoản', href: '/admin/accounts', icon: UserCog },
  { label: 'Cài đặt', href: '/admin/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-[260px] bg-[#1e1b4b] text-white p-8 flex flex-col fixed h-screen z-[100]">
      <div className="flex items-center gap-3 text-xl font-bold mb-10 pl-2">
        <div className="w-8 h-8 bg-gradient-to-br from-[#8b5cf6] to-[#c084fc] rounded-lg flex items-center justify-center">
          <Sparkles className="text-white w-[18px]" />
        </div>
        <span>DECOCO</span>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <ul>
          {navItems.map((item, idx) => {
            if (item.type === 'label') {
              return (
                <li key={idx} className="text-[0.7rem] text-[#94a3b8] font-bold uppercase tracking-wider mt-6 mb-3 pl-2">
                  {item.label}
                </li>
              );
            }

            const Icon = item.icon!;
            const isActive = pathname === item.href;

            return (
              <li key={idx} className="mb-1">
                <Link
                  href={item.href!}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl transition-all font-medium text-[0.9375rem]",
                    isActive
                      ? "bg-gradient-to-r from-[#4c1d95] to-[#7c3aed] text-white shadow-lg shadow-purple-900/30"
                      : "text-[#94a3b8] hover:bg-purple-900/10 hover:text-white"
                  )}
                >
                  <Icon className="mr-3 w-[1.125rem] opacity-80" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto flex items-center gap-3 p-4 bg-black/20 rounded-2xl">
        <div className="w-9 h-9 bg-[#8b5cf6] rounded-full flex items-center justify-center font-bold text-[0.8rem]">
          AD
        </div>
        <div className="flex-1">
          <div className="text-[0.85rem] font-semibold">Admin DECOCO</div>
          <div className="text-[0.7rem] text-[#94a3b8]">Quản trị viên</div>
        </div>
        <button
          onClick={handleSignOut}
          title="Đăng xuất"
          className="text-[#94a3b8] hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4" />
        </button>
      </div>
    </aside>
  );
}
