'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import * as XLSX from 'xlsx';
import { FileDown } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';

// Dynamically import the UploadForm with no SSR to avoid build-time errors with XLSX
const UploadForm = dynamic(() => import('@/components/admin/UploadForm'), {
  ssr: false,
  loading: () => <div className="p-20 text-center animate-pulse text-[#94a3b8]">Đang khởi tạo trình tải lên...</div>
});

const ReprocessDataButton = dynamic(() => import('@/components/admin/ReprocessDataButton'), {
  ssr: false,
  loading: () => <div className="p-6 text-center animate-pulse text-[#94a3b8]">...</div>
});

const DeleteAllDataButton = dynamic(() => import('@/components/admin/DeleteAllDataButton'), {
  ssr: false,
  loading: () => <div className="p-6 text-center animate-pulse text-[#94a3b8]">...</div>
});

function downloadTemplate() {
  const headers = [
    'Mã video',
    'Thời gian đăng',
    'Người sáng tạo',
    'ID nhà sáng tạo',
    'Tiêu đề video',
    'Tên sản phẩm',
    'VV',
    'Lượt thích',
    'Bình luận',
    'Chia sẻ',
    'Đơn hàng',
    'Số món bán ra từ video',
    'GMV quy ra từ video bán hàng (₫)',
    'Người theo dõi mới',
    'Lượt hiển thị sản phẩm',
    'Lượt nhấp sản phẩm',
  ];

  const sampleRow = [
    'VD_001',
    '2025-01-15',
    'Creator ABC',
    'CR_001',
    'Video giới thiệu sản phẩm mới',
    'Sản phẩm A',
    150000,
    5200,
    320,
    180,
    45,
    60,
    12500000,
    120,
    25000,
    3500,
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

  // Set column widths
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 14) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'TikTok_Upload_Template.xlsx');
}

export default function UploadPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Upload dữ liệu"
        subtitle="Tải file Excel báo cáo từ TikTok Seller Center lên hệ thống."
      />

      <div className="p-12 max-w-4xl animate-in fade-in duration-500">
        <UploadForm />

        {/* Re-process existing data section */}
        <div className="mt-8">
          <ReprocessDataButton />
        </div>

        {/* Delete all data section */}
        <div className="mt-8">
          <DeleteAllDataButton />
        </div>

        <div className="mt-10 grid grid-cols-2 gap-6">
          <div className="p-6 border border-[#30363d] rounded-xl bg-white/5">
            <h3 className="font-semibold mb-2">Lưu ý khi upload</h3>
            <ul className="text-xs text-[#94a3b8] space-y-2 list-disc pl-4">
              <li>File phải có các cột: Video ID, Views, GMV, Orders.</li>
              <li>Hệ thống sẽ dựa vào Video ID để cập nhật nếu video đã tồn tại (Upsert).</li>
              <li>Các video cũ sẽ không bị xóa.</li>
            </ul>
          </div>
          <div className="p-6 border border-[#30363d] rounded-xl bg-white/5">
            <h3 className="font-semibold mb-2">Tải file mẫu</h3>
            <p className="text-xs text-[#94a3b8] mb-4">Sử dụng file mẫu để đảm bảo định dạng dữ liệu chính xác nhất.</p>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 text-xs text-[#8b5cf6] font-bold hover:underline hover:text-[#7c3aed] transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              Download Template.xlsx
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

