'use client';

import React, { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import { UploadCloud, FileCheck, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

export default function UploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus({ type: null, message: '' });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        console.log('Parsed Data:', jsonData);

        // Map Excel columns to Database columns
        // Note: In reality, column names from TikTok Seller Center would be fixed
        const mappedVideos = jsonData.map((row: any) => ({
          video_id: row['Video ID'] || row['video_id'] || Math.random().toString(36).substr(2, 9),
          creator_name: row['Creator'] || row['creator_name'] || 'Unknown',
          video_title: row['Title'] || row['video_title'] || 'Untitled',
          source_type: (row['Source'] || row['source_type'] || '').toLowerCase().includes('brand') ? 'brand' : 'koc',
          views: parseInt(row['Views'] || row['views'] || 0),
          gmv: parseFloat(row['GMV'] || row['gmv'] || 0),
          orders: parseInt(row['Orders'] || row['orders'] || 0),
          published_at: row['Published At'] || row['published_at'] || new Date().toISOString(),
          // Add other fields as per PRD...
        }));

        const { error } = await supabase
          .from('videos')
          .upsert(mappedVideos, { onConflict: 'video_id' });

        if (error) throw error;

        setUploadStatus({ type: 'success', message: `Đã tải lên thành công ${mappedVideos.length} video!` });
      } catch (error: any) {
        console.error('Lỗi upload:', error);
        setUploadStatus({ type: 'error', message: 'Lỗi khi xử lý file: ' + error.message });
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader 
        title="Upload dữ liệu"
        subtitle="Tải file Excel báo cáo từ TikTok Seller Center lên hệ thống."
      />

      <div className="p-12 max-w-4xl animate-in fade-in duration-500">
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center">
            <UploadCloud className="w-10 h-10 text-[#8b5cf6]" />
          </div>
          
          <div>
            <h2 className="text-xl font-bold mb-2">Chọn file báo cáo</h2>
            <p className="text-[#94a3b8] text-sm">Chấp nhận file .xlsx hoặc .csv được trích xuất từ Seller Center.</p>
          </div>

          <label className="btn btn-primary px-8 py-3 cursor-pointer">
            <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} disabled={isUploading} />
            {isUploading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </span>
            ) : 'Chọn file từ máy tính'}
          </label>

          {uploadStatus.type === 'success' && (
            <div className="flex items-center gap-2 text-[#10b981] bg-emerald-500/10 px-4 py-2 rounded-lg text-sm">
              <FileCheck className="w-4 h-4" />
              {uploadStatus.message}
            </div>
          )}

          {uploadStatus.type === 'error' && (
            <div className="flex items-center gap-2 text-[#ef4444] bg-red-500/10 px-4 py-2 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4" />
              {uploadStatus.message}
            </div>
          )}
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
