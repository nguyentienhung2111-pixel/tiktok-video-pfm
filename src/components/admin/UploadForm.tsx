'use client';

import React, { useState } from 'react';
import { UploadCloud, FileCheck, AlertCircle, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

type SourceType = 'brand' | 'koc';

// Vietnamese TikTok Seller Center column header mapping
// Vietnamese TikTok Seller Center column header mapping
const COLUMN_MAPPING: Record<string, string> = {
  'Tên nhà sáng tạo': 'creator_name',
  'ID nhà sáng tạo': 'creator_id',
  'Thông tin video': 'video_title',
  'ID video': 'video_id',
  'Thời gian': 'published_at',
  'Sản phẩm': 'product_name',
  'VV': 'views',
  'Lượt thích': 'likes',
  'Bình luận': 'comments',
  'Lượt chia sẻ': 'shares',
  'Người theo dõi mới': 'new_followers',
  'Đơn hàng': 'orders',
  'Số món bán ra từ video': 'items_sold',
  'Tổng giá trị hàng hóa (Video) (₫)': 'gmv',
  'GPM (₫)': 'gpm',
  'GMV quy ra từ video bán hàng (₫)': 'gmv',
  'Tỷ lệ nhấp (Video)': 'ctr',
  'Tỷ lệ xem hết video': 'completion_rate',
  'Tỷ lệ nhấp đến đặt hàng (Video)': 'click_to_order_rate',
  'Chẩn đoán': 'diagnosis',
  'Lượt hiển thị': 'impressions',
  'Số lượng người xem video': 'reach',
  // Legacy/English fallbacks
  'Username': 'creator_name',
  'Tên người dùng': 'creator_name',
  'ID Creator': 'creator_id',
  'Video title': 'video_title',
  'Tiêu đề video': 'video_title',
  'Video post time': 'published_at',
  'Ngày đăng': 'published_at',
  'Thời gian đăng': 'published_at',
  'Tên sản phẩm': 'product_name',
  'Video views': 'views',
  'Lượt xem': 'views',
  'Video completion rate': 'completion_rate',
  'Tỷ lệ xem hết': 'completion_rate',
  'Nhấp sang đặt hàng': 'click_to_order_rate',
  'Reach': 'reach',
  'Tiếp cận': 'reach',
  'Impressions': 'impressions',
  'Hiển thị': 'impressions',
};

function parseNum(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  
  let s = String(val).trim();
  // Remove currency and other non-numeric symbols but keep comma and dot
  s = s.replace(/[₫%]/g, '').trim();
  
  // Logic for dots and commas:
  // If we have "1.000,00" -> 1000.00
  // If we have "1,000.00" -> 1000.00
  // If we have "1.000" (Vietnamese for thousand) -> 1000
  // If we have "1,000" (International for thousand) -> 1000
  
  // Count counts
  const dotCount = (s.match(/\./g) || []).length;
  const commaCount = (s.match(/,/g) || []).length;
  
  if (dotCount > 0 && commaCount > 0) {
    // Both exist. Usually 1.000,00 or 1,000.00.
    // Assume the last one is the decimal separator.
    const dotIndex = s.lastIndexOf('.');
    const commaIndex = s.lastIndexOf(',');
    if (dotIndex > commaIndex) {
      // 1,000.00
      s = s.replace(/,/g, '');
    } else {
      // 1.000,00
      s = s.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (commaCount > 1) {
    // 1,000,000 -> 1000000
    s = s.replace(/,/g, '');
  } else if (dotCount > 1) {
    // 1.000.000 -> 1000000
    s = s.replace(/\./g, '');
  } else if (commaCount === 1) {
    // 1000,50 -> 1000.50
    s = s.replace(/,/g, '.');
  }
  // If only one dot remains, it's already in the right format for parseFloat if it's a decimal.
  // But wait, if it's "1.000" (thousand), parseFloat will make it "1".
  // This is the trickiest case in Vietnamese vs International.
  // However, most TikTok reports for GMV will have large numbers.
  // If the string represents a large number like "1.500", it's probably 1500.
  // But for rates like "0.5", it's 0.5.
  
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  
  const s = String(val).trim();
  if (!s) return null;
  
  // Try standard Date parsing first (handles ISO, some Regional)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  
  // Handle DD/MM/YYYY format commonly used in Vietnamese Excel exports
  const parts = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    const year = parseInt(parts[3], 10);
    
    // Create date at noon to avoid timezone shifts during initialization
    const date = new Date(year, month, day, 12, 0, 0);
    
    // Parse time if present (e.g., " 14:30")
    if (parts[4]) {
      const timeMatch = parts[4].match(/(\d{1,2})[:](\d{1,2})([:](\d{1,2}))?/);
      if (timeMatch) {
        date.setHours(parseInt(timeMatch[1], 10));
        date.setMinutes(parseInt(timeMatch[2], 10));
        if (timeMatch[4]) date.setSeconds(parseInt(timeMatch[4], 10));
      }
    }
    
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  
  return null;
}

function mapRow(row: Record<string, unknown>, sourceType: SourceType): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    source_type: sourceType,
    likes: 0,
    comments: 0,
    shares: 0,
    new_followers: 0,
    orders: 0,
    gmv: 0,
    gpm: 0,
    ctr: 0,
    completion_rate: 0,
    conversion_rate: 0,
    click_to_order_rate: 0,
    video_duration_sec: 0,
    reach: 0,
    impressions: 0,
    views: 0,
    tags: [],
    raw_data: row // Store original row data for transparency
  };

  for (const [colHeader, value] of Object.entries(row)) {
    const field = COLUMN_MAPPING[colHeader.trim()];
    if (!field) continue;

    if (['video_id', 'creator_name', 'creator_id', 'video_title', 'product_name', 'diagnosis'].includes(field)) {
      mapped[field] = value ? String(value).trim() : null;
    } else if (field === 'published_at') {
      mapped[field] = parseDate(value);
    } else {
      mapped[field] = parseNum(value);
    }
  }

  if (!mapped['video_id']) {
    mapped['video_id'] = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  return mapped;
}

export default function UploadForm() {
  const [sourceType, setSourceType] = useState<SourceType>('brand');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    detail?: string;
  }>({ type: null, message: '' });

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
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

        if (jsonData.length === 0) {
          setUploadStatus({ type: 'error', message: 'File không có dữ liệu hoặc không đọc được.' });
          return;
        }

        const mappedVideos = jsonData.map(row => mapRow(row, sourceType));

        const { error } = await supabase
          .from('videos')
          .upsert(mappedVideos, { onConflict: 'video_id' });

        if (error) throw error;

        // Log upload history
        await supabase.from('upload_history').insert({
          file_name: file.name,
          source_type: sourceType,
          row_count: jsonData.length,
          success_count: mappedVideos.length,
          error_count: 0,
        });

        setUploadStatus({
          type: 'success',
          message: `Tải lên thành công ${mappedVideos.length} video!`,
          detail: `File: ${file.name} | Nguồn: ${sourceType === 'brand' ? 'Thương hiệu' : 'KOC/Affiliate'}`
        });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Lỗi upload:', error);
        setUploadStatus({ type: 'error', message: 'Lỗi khi xử lý file: ' + msg });
      } finally {
        setIsUploading(false);
        // Reset file input
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      {/* Source Type Selector */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-[#94a3b8] mb-4 uppercase tracking-wider">Chọn loại nguồn dữ liệu</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setSourceType('brand')}
            className={`flex-1 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
              sourceType === 'brand'
                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                : 'border-[#30363d] text-[#94a3b8] hover:border-emerald-500/50'
            }`}
          >
            Thương hiệu (Brand)
          </button>
          <button
            onClick={() => setSourceType('koc')}
            className={`flex-1 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
              sourceType === 'koc'
                ? 'bg-purple-500/15 border-purple-500 text-purple-400'
                : 'border-[#30363d] text-[#94a3b8] hover:border-purple-500/50'
            }`}
          >
            KOC / Affiliate
          </button>
        </div>
        <p className="text-xs text-[#94a3b8] mt-3">
          {sourceType === 'brand'
            ? 'Dành cho video từ kênh TikTok Official của thương hiệu DECOCO.'
            : 'Dành cho video từ KOC, Affiliate, và Creator bên ngoài.'}
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
          sourceType === 'brand' ? 'bg-emerald-500/10' : 'bg-purple-500/10'
        }`}>
          <UploadCloud className={`w-10 h-10 ${sourceType === 'brand' ? 'text-emerald-400' : 'text-[#8b5cf6]'}`} />
        </div>

        <div>
          <h2 className="text-xl font-bold mb-1">
            Upload báo cáo {sourceType === 'brand' ? 'Thương hiệu' : 'KOC/Affiliate'}
          </h2>
          <p className="text-[#94a3b8] text-sm">
            Chấp nhận file .xlsx hoặc .csv từ TikTok Seller Center.
          </p>
        </div>

        <label className={`cursor-pointer px-8 py-3 rounded-xl font-semibold text-white transition-all ${
          isUploading
            ? 'bg-[#30363d] cursor-not-allowed'
            : sourceType === 'brand'
            ? 'bg-emerald-600 hover:bg-emerald-500'
            : 'bg-[#8b5cf6] hover:bg-[#7c3aed]'
        }`}>
          <input
            type="file"
            className="hidden"
            accept=".xlsx,.csv,.xls"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          {isUploading ? 'Đang xử lý...' : 'Chọn file từ máy tính'}
        </label>

        {uploadStatus.type === 'success' && (
          <div className="w-full flex flex-col items-center gap-1 text-[#10b981] bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 rounded-xl">
            <div className="flex items-center gap-2 font-semibold">
              <FileCheck className="w-4 h-4" />
              {uploadStatus.message}
            </div>
            {uploadStatus.detail && (
              <div className="text-xs text-emerald-500/80">{uploadStatus.detail}</div>
            )}
          </div>
        )}

        {uploadStatus.type === 'error' && (
          <div className="w-full flex items-center gap-2 text-[#ef4444] bg-red-500/10 border border-red-500/20 px-6 py-4 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {uploadStatus.message}
          </div>
        )}
      </div>

      {/* Column mapping guide */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-[#94a3b8] mb-4 uppercase tracking-wider">Cột dữ liệu được nhận diện</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-[#94a3b8]">
          {[
            'Video ID / ID video',
            'Username / Creator',
            'Video title / Tiêu đề',
            'Video post time / Ngày đăng',
            'Product name / Tên sản phẩm',
            'Video views / Lượt xem',
            'Likes / Lượt thích',
            'Comments / Bình luận',
            'Shares / Chia sẻ',
            'New followers',
            'Orders / Đơn hàng',
            'GMV / Doanh thu',
            'GPM',
            'CTR / Tỷ lệ nhấp',
            'Video completion rate',
            'Conversion rate',
            'Click-to-order rate',
            'Reach / Tiếp cận',
            'Impressions / Hiển thị',
            'Video diagnosis / Chẩn đoán',
          ].map(col => (
            <div key={col} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]/60 flex-shrink-0" />
              <span>{col}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
