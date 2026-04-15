'use client';

import React, { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Video, Profile } from '@/types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PAGE_SIZE = 25;

interface VideoTableProps {
  videos: Video[];
  users: Profile[];
  onAssign?: (videoId: string, userId: string) => void;
  onTag?: (video: Video) => void;
}

const fmtVND = (val: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const fmtNum = (val: number) =>
  new Intl.NumberFormat('vi-VN').format(val);

const fmtPct = (val: number) => `${val.toFixed(1)}%`;

export default function VideoTable({ videos, users, onAssign, onTag }: VideoTableProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(videos.length / PAGE_SIZE));
  const paged = videos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="bg-[#161b22] rounded-2xl border border-[#30363d] overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table className="w-full border-collapse text-sm" style={{ minWidth: '2200px' }}>
          <thead>
            <tr className="bg-[#0d1117]">
              {/* Sticky cols */}
              <th className="sticky left-0 z-20 bg-[#0d1117] p-3 text-left text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-r border-[#30363d] min-w-[200px]">Video</th>
              <th className="sticky left-[200px] z-20 bg-[#0d1117] p-3 text-left text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-r border-[#30363d] min-w-[140px]">Creator</th>
              <th className="sticky left-[340px] z-20 bg-[#0d1117] p-3 text-left text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-r border-[#30363d] min-w-[90px]">Nguồn</th>
              {/* Normal cols */}
              <th className="p-3 text-left text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-[#30363d] min-w-[140px]">Nhân sự</th>
              <th className="p-3 text-left text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-[#30363d] min-w-[120px]">Ngày đăng</th>
              <th className="p-3 text-right text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-[#30363d] min-w-[100px]">Views</th>
              <th className="p-3 text-right text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-[#30363d] min-w-[100px]">Tương tác</th>
              <th className="p-3 text-right text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-[#30363d] min-w-[100px]">Follow mới</th>
              <th className="p-3 text-right text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-[#30363d] min-w-[130px]">GMV</th>
              <th className="p-3 text-right text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-[#30363d] min-w-[80px]">Đơn</th>
              <th className="p-3 text-right text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-[#30363d] min-w-[110px]">GPM</th>
              <th className="p-3 text-right text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-[#30363d] min-w-[80px]">CTR</th>
              <th className="p-3 text-right text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-[#30363d] min-w-[90px]">Xem hết</th>
              <th className="p-3 text-right text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-[#30363d] min-w-[90px]">Chuyển đổi</th>
              <th className="p-3 text-right text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-[#30363d] min-w-[90px]">Nhấp→Đặt</th>
              <th className="p-3 text-right text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-[#30363d] min-w-[90px]">Reach</th>
              <th className="p-3 text-left text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-[#30363d] min-w-[160px]">Chẩn đoán</th>
              <th className="p-3 text-center text-[0.7rem] font-semibold uppercase text-[#94a3b8] whitespace-nowrap border-b border-[#30363d] min-w-[90px]">Tag</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((v, i) => (
              <tr
                key={v.id}
                className={cn(
                  "border-b border-[#30363d] transition-colors hover:bg-white/[0.02]",
                  i % 2 === 0 ? "" : "bg-white/[0.01]"
                )}
              >
                {/* Sticky: Video title */}
                <td className="sticky left-0 z-10 bg-[#161b22] p-3 border-r border-[#30363d] whitespace-nowrap">
                  <div className="truncate max-w-[185px] font-medium text-[#f8fafc]" title={v.video_title || ''}>
                    {v.video_title || '—'}
                  </div>
                  {v.video_id && (
                    <div className="text-[0.65rem] text-[#94a3b8] font-mono mt-0.5">{v.video_id}</div>
                  )}
                </td>

                {/* Sticky: Creator */}
                <td className="sticky left-[200px] z-10 bg-[#161b22] p-3 border-r border-[#30363d] whitespace-nowrap">
                  <div className="truncate max-w-[125px] text-[#f8fafc]">{v.creator_name || '—'}</div>
                </td>

                {/* Sticky: Source */}
                <td className="sticky left-[340px] z-10 bg-[#161b22] p-3 border-r border-[#30363d] whitespace-nowrap">
                  <span className={cn(
                    "px-2 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wide",
                    v.source_type === 'brand'
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-purple-500/15 text-purple-400"
                  )}>
                    {v.source_type === 'brand' ? 'Brand' : 'KOC'}
                  </span>
                </td>

                {/* Nhân sự */}
                <td className="p-3 whitespace-nowrap">
                  <select
                    className="bg-[#0f172a] text-white border border-[#30363d] rounded-lg px-2 py-1 text-xs outline-none cursor-pointer hover:border-[#8b5cf6] transition-colors w-full max-w-[130px]"
                    value={v.assigned_user_id || ''}
                    onChange={(e) => onAssign && onAssign(v.id, e.target.value)}
                  >
                    <option value="">— Chọn NV —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.display_name}</option>
                    ))}
                  </select>
                </td>

                {/* Ngày đăng */}
                <td className="p-3 text-[#94a3b8] whitespace-nowrap text-xs">
                  {v.published_at ? new Date(v.published_at).toLocaleDateString('vi-VN') : '—'}
                </td>

                {/* Views */}
                <td className="p-3 text-right font-semibold whitespace-nowrap">
                  {fmtNum(v.views)}
                </td>

                {/* Tương tác */}
                <td className="p-3 text-right text-[#94a3b8] whitespace-nowrap">
                  {fmtNum(v.engagement)}
                </td>

                {/* Follow mới */}
                <td className="p-3 text-right text-[#94a3b8] whitespace-nowrap">
                  {fmtNum(v.new_followers)}
                </td>

                {/* GMV */}
                <td className="p-3 text-right font-bold text-[#8b5cf6] whitespace-nowrap">
                  {fmtVND(v.gmv)}
                </td>

                {/* Đơn hàng */}
                <td className="p-3 text-right whitespace-nowrap">
                  {fmtNum(v.orders)}
                </td>

                {/* GPM */}
                <td className="p-3 text-right text-[#94a3b8] whitespace-nowrap text-xs">
                  {fmtVND(v.gpm)}
                </td>

                {/* CTR */}
                <td className="p-3 text-right whitespace-nowrap">
                  <span className={cn(
                    "text-xs font-semibold",
                    v.ctr >= 5 ? "text-[#8b5cf6]" : v.ctr >= 2 ? "text-[#10b981]" : "text-[#94a3b8]"
                  )}>
                    {fmtPct(v.ctr)}
                  </span>
                </td>

                {/* Xem hết */}
                <td className="p-3 text-right whitespace-nowrap">
                  <span className={cn(
                    "text-xs font-semibold",
                    v.completion_rate >= 50 ? "text-[#06b6d4]" : "text-[#94a3b8]"
                  )}>
                    {fmtPct(v.completion_rate)}
                  </span>
                </td>

                {/* Chuyển đổi */}
                <td className="p-3 text-right text-[#94a3b8] whitespace-nowrap text-xs">
                  {fmtPct(v.conversion_rate)}
                </td>

                {/* Nhấp→Đặt */}
                <td className="p-3 text-right text-[#94a3b8] whitespace-nowrap text-xs">
                  {fmtPct(v.click_to_order_rate)}
                </td>

                {/* Reach */}
                <td className="p-3 text-right text-[#94a3b8] whitespace-nowrap">
                  {fmtNum(v.reach)}
                </td>

                {/* Chẩn đoán */}
                <td className="p-3 whitespace-nowrap">
                  <div className="truncate max-w-[150px] text-[#94a3b8] text-xs" title={v.diagnosis || ''}>
                    {v.diagnosis || '—'}
                  </div>
                </td>

                {/* Tag */}
                <td className="p-3 text-center whitespace-nowrap">
                  <button
                    onClick={() => onTag && onTag(v)}
                    className="px-3 py-1 border border-[#30363d] rounded-lg text-[0.7rem] font-semibold hover:bg-[#8b5cf6]/10 hover:border-[#8b5cf6] hover:text-[#8b5cf6] transition-all"
                  >
                    Tag
                  </button>
                </td>
              </tr>
            ))}

            {paged.length === 0 && (
              <tr>
                <td colSpan={18} className="p-16 text-center text-[#94a3b8]">
                  Không có dữ liệu video
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#30363d]">
          <span className="text-xs text-[#94a3b8]">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, videos.length)} / {videos.length} video
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-[#30363d] rounded-lg text-xs font-semibold disabled:opacity-30 hover:bg-white/5 transition-colors"
            >
              ← Trước
            </button>
            <span className="text-xs text-[#94a3b8] px-2">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-[#30363d] rounded-lg text-xs font-semibold disabled:opacity-30 hover:bg-white/5 transition-colors"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
