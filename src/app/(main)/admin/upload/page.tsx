'use client';

import React from 'react';
import dynamic from 'next/dynamic';
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
            <button className="text-xs text-[#8b5cf6] font-bold hover:underline">Download Template.xlsx</button>
          </div>
        </div>
      </div>
    </div>
  );
}

