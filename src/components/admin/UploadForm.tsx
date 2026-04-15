'use client';

import React, { useState } from 'react';
import { UploadCloud, FileCheck, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

type SourceType = 'brand' | 'koc';

// Vietnamese TikTok Seller Center column header mapping
const COLUMN_MAPPING: Record<string, string | undefined> = {
  // English Headers
  'Video ID': 'video_id',
  'Source Type': 'source_type',
  'Creator Name': 'creator_name',
  'Creator ID': 'creator_id',
  'Video Title': 'video_title',
  'Published Time': 'published_at',
  'Video Post Time': 'published_at',
  'Post Date': 'published_at',
  'Product Name': 'product_name',
  'Product ID': 'product_id',
  'Video Views': 'views',
  'Views': 'views',
  'Video Likes': 'likes',
  'Likes': 'likes',
  'Video Comments': 'comments',
  'Comments': 'comments',
  'Video Shares': 'shares',
  'Shares': 'shares',
  'Orders': 'orders',
  'GMV': 'gmv',
  'GMV (₫)': 'gmv',
  'Engagement': 'engagement',
  
  // Vietnamese Headers (TikTok Seller Center & Analytic Data)
  'Mã video': 'video_id',
  'ID video': 'video_id',
  'Nguồn': 'source_type',
  'Người sáng tạo': 'creator_name',
  'Tên tác giả': 'creator_name',
  'ID nhà sáng tạo': 'creator_id',
  'ID người sáng tạo': 'creator_id',
  'Tiêu đề video': 'video_title',
  'Thông tin video': 'video_title',
  'Thời gian đăng': 'published_at',
  'Ngày đăng': 'published_at',
  'Thời gian': 'published_at',
  'Tên sản phẩm': 'product_name',
  'Sản phẩm': 'product_name',
  'ID sản phẩm': 'product_id',
  'Lượt xem': 'views',
  'Lượt xem video': 'views',
  'Lượt thích': 'likes',
  'Bình luận': 'comments',
  'Chia sẻ': 'shares',
  'Lượt chia sẻ': 'shares',
  'Đơn hàng': 'orders',
  'Số đơn hàng': 'orders',
  'Số lượng đơn hàng': 'orders',
  'Số món bán ra từ video': 'orders', // Map to orders as fallback if items_sold column is missing
  'Tổng giá trị hàng hóa (Video) (₫)': 'gmv',
  'GMV quy ra từ video bán hàng (₫)': 'gmv',
  'Doanh thu (₫)': 'gmv',
  'Doanh số (₫)': 'gmv',
  'Giá trị giao dịch': 'gmv',
  'Tỷ lệ nhấp (CTR)': 'ctr',
  'Tỷ lệ nhấp (Video)': 'ctr',
  'Tỷ lệ xem hết': 'completion_rate',
  'Tỷ lệ xem hết video': 'completion_rate',
  'Lượt hiển thị': 'impressions',
  'Số lượng người xem video': 'reach',
  'Chẩn đoán': 'diagnosis',
  'Gán cho': 'assigned_user_id',
  'Thẻ': 'tags',
  
  'video_id': 'video_id',
  'published_at': 'published_at',
  'gmv': 'gmv',
  'views': 'views',
  'orders': 'orders',
  'Tên nhà sáng tạo': 'creator_name',
  'Ngày': 'published_at',
};

function parseNum(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  
  const s = String(val).trim().replace(/[₫%]/g, '');
  if (!s) return 0;
  
  // Detect European/Vietnamese format (1.234,56)
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  
  if (lastComma > lastDot) {
    // 1.234,56 -> 1234.56
    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  }
  
  // Default/US format (1,234.56)
  return parseFloat(s.replace(/,/g, ''));
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  
  // Handle Excel Serial Dates (numbers like 45400)
  if (typeof val === 'number') {
    const excelBaseDate = new Date(1899, 11, 30);
    const date = new Date(excelBaseDate.getTime() + val * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }

  if (val instanceof Date) return val.toISOString().split('T')[0];
  
  const s = String(val).trim();
  if (!s) return null;
  
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  
  // Handle YYYY-MM-DD
  const ymdParts = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(.*)$/);
  if (ymdParts) {
    const year = parseInt(ymdParts[1], 10);
    const month = parseInt(ymdParts[2], 10) - 1;
    const day = parseInt(ymdParts[3], 10);
    const date = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }

  // Handle DD/MM/YYYY
  const parts = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    const year = parseInt(parts[3], 10);
    const date = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }
  
  return null;
}

function mapRow(
  row: Record<string, unknown>, 
  sourceType: SourceType, 
  mappings: { raw_name: string, product_id: string }[]
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    source_type: sourceType,
    product_id: null,
    likes: 0,
    comments: 0,
    shares: 0,
    orders: 0,
    gmv: 0,
    views: 0,
    tags: [],
    raw_data: row 
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

  // Auto-map product_id from product_sku_mappings
  if (mapped['product_name']) {
    const rawName = String(mapped['product_name']).toLowerCase().trim();
    const mapping = mappings.find(m => m.raw_name.toLowerCase().trim() === rawName);
    if (mapping) {
      mapped['product_id'] = mapping.product_id;
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
        
        // Use header: 1 to get array of arrays for header detection
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        if (rawRows.length === 0) {
          setUploadStatus({ type: 'error', message: 'File không có dữ liệu.' });
          return;
        }

        // --- Automatic Header Row Detection ---
        let headerRowIndex = 0;
        let maxMatches = 0;
        
        // Scan first 15 rows to find the one that matches our COLUMN_MAPPING best
        for (let i = 0; i < Math.min(15, rawRows.length); i++) {
          const row = rawRows[i];
          if (!Array.isArray(row)) continue;
          
          let matches = 0;
          row.forEach(cell => {
            const cellStr = String(cell || '').trim();
            if (COLUMN_MAPPING[cellStr]) matches++;
          });
          
          if (matches > maxMatches) {
            maxMatches = matches;
            headerRowIndex = i;
          }
        }

        // Re-parse from the detected header row
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { 
          range: headerRowIndex 
        });

        if (jsonData.length === 0 || maxMatches === 0) {
          setUploadStatus({ 
            type: 'error', 
            message: 'Không tìm thấy dòng tiêu đề phù hợp.', 
            detail: 'Hãy đảm bảo file Excel có chứa các cột như "Mã video", "GMV", "Ngày"...' 
          });
          return;
        }

        // Fetch existing SKU mappings for auto-linkage
        const { data: skuMappings } = await supabase
          .from('product_sku_mappings')
          .select('raw_name, product_id');

        const mappedVideos = jsonData.map(row => mapRow(row, sourceType, skuMappings || []));

        if (mappedVideos.length === 0) {
          throw new Error('Không có dữ liệu hợp lệ được trích xuất từ file.');
        }

        // Batch upsert to prevent large payload errors (Smaller batch for more stability)
        const BATCH_SIZE = 200; 
        let successCount = 0;
        
        for (let i = 0; i < mappedVideos.length; i += BATCH_SIZE) {
          const batch = mappedVideos.slice(i, i + BATCH_SIZE);
          const { error: batchError } = await supabase
            .from('videos')
            .upsert(batch, { onConflict: 'video_id' });
            
          if (batchError) {
            console.error('Batch error:', batchError);
            throw new Error(`Lỗi khi lưu dữ liệu (Batch ${Math.floor(i/BATCH_SIZE) + 1}): ${batchError.message}`);
          }
          successCount += batch.length;
        }

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
      } catch (error: any) {
        const msg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
        console.error('Lỗi upload:', error);
        setUploadStatus({ 
          type: 'error', 
          message: 'Lỗi khi xử lý file:', 
          detail: msg 
        });
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 text-foreground">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Chọn loại nguồn dữ liệu</h3>
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
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
          sourceType === 'brand' ? 'bg-emerald-500/10' : 'bg-purple-500/10'
        }`}>
          <UploadCloud className={`w-10 h-10 ${sourceType === 'brand' ? 'text-emerald-400' : 'text-[#8b5cf6]'}`} />
        </div>

        <div>
           <h2 className="text-xl font-bold mb-1 text-foreground">
            Upload báo cáo {sourceType === 'brand' ? 'Thương hiệu' : 'KOC/Affiliate'}
          </h2>
          <p className="text-muted-foreground text-sm">
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
          <input type="file" className="hidden" accept=".xlsx,.csv,.xls" onChange={handleFileUpload} disabled={isUploading} />
          {isUploading ? 'Đang xử lý...' : 'Chọn file từ máy tính'}
        </label>

        {uploadStatus.type === 'success' && (
          <div className="w-full flex flex-col items-center gap-1 text-[#10b981] bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 rounded-xl">
             <span className="font-semibold">{uploadStatus.message}</span>
             {uploadStatus.detail && <span className="text-xs opacity-80">{uploadStatus.detail}</span>}
          </div>
        )}

        {uploadStatus.type === 'error' && (
          <div className="w-full flex items-start gap-3 text-red-400 bg-red-500/10 border border-red-500/20 px-6 py-4 rounded-xl text-sm transition-all animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col items-start gap-1">
              <span className="font-bold">{uploadStatus.message}</span>
              {uploadStatus.detail && (
                <span className="text-xs text-red-500/80 break-all text-left">
                  {uploadStatus.detail}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

       <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Dữ liệu quan trọng cần có</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-xs text-muted-foreground">
          {['Mã video (ID)', 'GMV / Doanh thu', 'Lượt xem (Views)', 'Ngày đăng (Post time)', 'Tên creator', 'Số đơn hàng'].map(col => (
            <div key={col} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span>{col}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
