'use client';

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { Video, Profile } from '@/types';

interface VideoTableProps {
  videos: Video[];
  users: Profile[];
  onAssign?: (videoId: string, userId: string) => void;
  onTag?: (video: Video) => void;
}

export default function VideoTable({ videos, users, onAssign, onTag }: VideoTableProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  return (
    <div className="table-container bg-[#161b22] rounded-2xl border border-[#30363d] overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table className="w-full border-collapse min-w-[1800px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[#161b22] shadow-[1px_0_0_0_#30363d] p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">Video</th>
              <th className="sticky left-[200px] z-10 bg-[#161b22] shadow-[1px_0_0_0_#30363d] p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">Creator</th>
              <th className="sticky left-[350px] z-10 bg-[#161b22] shadow-[1px_0_0_0_#30363d] p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">Nguồn</th>
              <th className="p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">Nhân sự</th>
              <th className="p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">ID Video</th>
              <th className="p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">Ngày đăng</th>
              <th className="p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">Sản phẩm</th>
              <th className="p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">Views</th>
              <th className="p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">Tương tác</th>
              <th className="p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">Follow mới</th>
              <th className="p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">GMV</th>
              <th className="p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">Đơn hàng</th>
              <th className="p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">GPM</th>
              <th className="p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">CTR</th>
              <th className="p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">Xem hết</th>
              <th className="p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">Nhấp→Đặt</th>
              <th className="p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">Chẩn đoán</th>
              <th className="p-4 text-xs font-semibold uppercase text-[#94a3b8] text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v.id} className="border-t border-[#30363d]">
                <td className="sticky left-0 z-10 bg-[#161b22] shadow-[1px_0_0_0_#30363d] p-4">
                  <div className="truncate max-w-[200px]" title={v.video_title}>{v.video_title}</div>
                </td>
                <td className="sticky left-[200px] z-10 bg-[#161b22] shadow-[1px_0_0_0_#30363d] p-4">
                  <div className="truncate max-w-[150px]">{v.creator_name}</div>
                </td>
                <td className="sticky left-[350px] z-10 bg-[#161b22] shadow-[1px_0_0_0_#30363d] p-4">
                  <span className={cn(
                    "px-2 py-1 rounded-md text-[0.7rem] font-semibold uppercase",
                    v.source_type === 'brand' ? "bg-emerald-500/10 text-emerald-500" : "bg-purple-500/10 text-purple-500"
                  )}>
                    {v.source_type === 'brand' ? 'Thương hiệu' : 'KOC'}
                  </span>
                </td>
                <td className="p-4">
                  <select 
                    className="bg-[#0f172a] text-white border border-[#30363d] rounded-md px-2 py-1 text-xs outline-none cursor-pointer"
                    value={v.assigned_user_id || ''}
                    onChange={(e) => onAssign && onAssign(v.id, e.target.value)}
                  >
                    <option value="">-- Chọn NV --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.display_name}</option>
                    ))}
                  </select>
                </td>
                <td className="p-4 text-[#94a3b8] font-mono text-xs">{v.video_id}</td>
                <td className="p-4 text-xs">{new Date(v.published_at).toLocaleDateString('vi-VN')}</td>
                <td className="p-4 text-xs"><div className="truncate max-w-[150px]">{v.product_name}</div></td>
                <td className="p-4 font-semibold text-sm">{formatNumber(v.views)}</td>
                <td className="p-4 text-sm">{formatNumber(v.engagement)}</td>
                <td className="p-4 text-sm">{formatNumber(v.new_followers)}</td>
                <td className="p-4 font-bold text-sm text-[#8b5cf6]">{formatCurrency(v.gmv)}</td>
                <td className="p-4 text-sm">{v.orders}</td>
                <td className="p-4 text-xs">{formatCurrency(v.gpm)}</td>
                <td className="p-4 text-xs">{v.ctr}%</td>
                <td className="p-4 text-xs">{v.completion_rate}%</td>
                <td className="p-4 text-xs">{v.conversion_rate}%</td>
                <td className="p-4 text-xs"><div className="truncate max-w-[200px]" title={v.diagnosis}>{v.diagnosis}</div></td>
                <td className="p-4">
                  <button 
                    onClick={() => onTag && onTag(v)}
                    className="px-3 py-1 border border-[#30363d] rounded-md text-[0.7rem] font-semibold hover:bg-white/5 transition-colors"
                  >
                    Gắn Tag
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
