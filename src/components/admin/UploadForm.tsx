'use client';

import React, { useState } from 'react';
import { UploadCloud, AlertCircle, CalendarIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { DateRangePicker } from '@/components/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

type SourceType = 'brand' | 'koc';

// Normalize a header string: trim, strip invisible/BOM chars, normalize Unicode
function normalizeHeader(h: string): string {
  return h
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  'Video Views': 'views',
  'Views': 'views',
  'VV': 'views',
  'GVV': 'views',
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
  'New Followers': 'new_followers',
  'Click to Order Rate': 'click_to_order_rate',
  'Unique Buyers': 'reach',
  'Items Sold': 'items_sold',

  // Vietnamese Headers
  'Mã video': 'video_id',
  'ID video': 'video_id',
  'Nguồn': 'source_type',
  'Tên nhà sáng tạo': 'creator_name',
  'Người sáng tạo': 'creator_name',
  'Tên tác giả': 'creator_name',
  'ID nhà sáng tạo': 'creator_id',
  'ID người sáng tạo': 'creator_id',
  'Tiêu đề video': 'video_title',
  'Thông tin video': 'video_title',
  'Thời gian đăng': 'published_at',
  'Ngày đăng': 'published_at',
  'Thời gian': 'published_at',
  'Ngày': 'published_at',
  'Tên sản phẩm': 'product_name',
  'Sản phẩm': 'product_name',
  'Lượt xem': 'views',
  'Lượt xem video': 'views',
  'Lượt thích': 'likes',
  'Bình luận': 'comments',
  'Chia sẻ': 'shares',
  'Lượt chia sẻ': 'shares',
  'Đơn hàng': 'orders',
  'Số đơn hàng': 'orders',
  'Số lượng đơn hàng': 'orders',
  'Đơn đặt hàng': 'orders',
  'Số món bán ra từ video': 'items_sold',
  'Tổng giá trị hàng hóa (Video) (₫)': 'total_merchandise_value',
  'GMV quy ra từ video bán hàng (₫)': 'gmv',
  'Doanh thu (₫)': 'gmv',
  'Doanh số (₫)': 'gmv',
  'Giá trị giao dịch': 'gmv',
  'Người theo dõi mới': 'new_followers',
  'Lượt nhấp từ Xem đến Thích': 'view_to_like_clicks',
  'Lượt hiển thị sản phẩm': 'impressions',
  'Lượt nhấp sản phẩm': 'product_clicks',
  'Số khách hàng độc nhất': 'reach',
  'Tỷ lệ từ Xem đến Thích': 'view_to_like_rate',
  'Tỷ lệ nhấp đến đặt hàng (Video)': 'click_to_order_rate',
  'Lượt hiển thị': 'impressions',
  'Số lượng người xem video': 'reach',
  'Chẩn đoán': 'diagnosis',
  'Gán cho': 'assigned_user_id',
  'Thẻ': 'tags',

  // DB field name fallbacks
  'video_id': 'video_id',
  'published_at': 'published_at',
  'gmv': 'gmv',
  'views': 'views',
  'orders': 'orders',
};

const NUMERIC_FIELDS = new Set([
  'views', 'likes', 'comments', 'shares', 'orders', 'gmv',
  'new_followers', 'impressions', 'reach',
  'engagement', 'click_to_order_rate', 'items_sold',
  'total_merchandise_value', 'view_to_like_clicks', 'product_clicks',
  'view_to_like_rate',
]);

// Fields that go into videos table (metadata only)
const METADATA_FIELDS = new Set([
  'video_id', 'source_type', 'creator_name', 'creator_id',
  'video_title', 'published_at', 'product_name', 'product_id',
  'diagnosis', 'assigned_user_id', 'tags',
]);

// Fields that go into video_period_metrics table
const METRIC_FIELDS = new Set([
  'views', 'likes', 'comments', 'shares', 'orders', 'gmv',
  'new_followers', 'impressions', 'reach', 'engagement',
  'click_to_order_rate', 'items_sold',
]);

function parseNum(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  const s = String(val).trim().replace(/[₫%]/g, '');
  if (!s) return 0;

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  let result: number;
  if (lastComma > lastDot) {
    result = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  } else {
    result = parseFloat(s.replace(/,/g, ''));
  }

  return isNaN(result) ? 0 : result;
}

function parseDate(val: unknown): string | null {
  if (!val) return null;

  if (typeof val === 'number') {
    const excelBaseDate = new Date(1899, 11, 30);
    const date = new Date(excelBaseDate.getTime() + val * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }

  if (val instanceof Date) return val.toISOString().split('T')[0];

  const s = String(val).trim();
  if (!s) return null;

  const ymdParts = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(.*)$/);
  if (ymdParts) {
    const date = new Date(parseInt(ymdParts[1]), parseInt(ymdParts[2]) - 1, parseInt(ymdParts[3]), 12, 0, 0);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }

  const parts = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);
  if (parts) {
    const date = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]), 12, 0, 0);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

  return null;
}

// Extract mapped fields from a raw data row
export function extractFieldsFromRaw(rawData: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [colHeader, value] of Object.entries(rawData)) {
    const normalized = normalizeHeader(colHeader);
    const field = COLUMN_MAPPING[normalized] || COLUMN_MAPPING[colHeader.trim()];
    if (!field) continue;

    if (field === 'total_merchandise_value' || field === 'view_to_like_clicks' ||
        field === 'product_clicks' || field === 'view_to_like_rate') {
      if (field === 'total_merchandise_value') {
        const num = parseNum(value);
        if (num > 0 && !result['gmv']) {
          result['gmv'] = num;
        }
      }
      continue;
    }

    if (['video_id', 'creator_name', 'creator_id', 'video_title', 'product_name', 'diagnosis'].includes(field)) {
      result[field] = value ? String(value).trim() : null;
    } else if (field === 'published_at') {
      result[field] = parseDate(value);
    } else if (NUMERIC_FIELDS.has(field)) {
      const num = parseNum(value);
      const existing = result[field] as number | undefined;
      if (num !== 0 || existing === undefined || existing === 0) {
        result[field] = num;
      }
    } else {
      result[field] = value;
    }
  }

  return result;
}

function mapRow(
  row: Record<string, unknown>,
  sourceType: SourceType,
  mappings: { raw_name: string; product_id: string }[]
): { metadata: Record<string, unknown>; metrics: Record<string, unknown> } {
  const extracted = extractFieldsFromRaw(row);

  // Split into metadata and metrics
  const metadata: Record<string, unknown> = {
    source_type: sourceType,
    product_id: null,
    tags: [],
    raw_data: row,
  };

  const metrics: Record<string, unknown> = {
    views: 0, likes: 0, comments: 0, shares: 0,
    orders: 0, gmv: 0, new_followers: 0, impressions: 0,
    reach: 0, engagement: 0, click_to_order_rate: 0, items_sold: 0,
  };

  for (const [field, value] of Object.entries(extracted)) {
    if (METADATA_FIELDS.has(field)) {
      metadata[field] = value;
    }
    if (METRIC_FIELDS.has(field)) {
      const num = value as number;
      if (num !== 0 || (metrics[field] as number) === 0) {
        metrics[field] = num;
      }
    }
  }

  // Auto-map product_id
  if (metadata['product_name']) {
    const rawName = String(metadata['product_name']).toLowerCase().trim();
    const mapping = mappings.find(m => m.raw_name.toLowerCase().trim() === rawName);
    if (mapping) {
      metadata['product_id'] = mapping.product_id;
    }
  }

  if (!metadata['video_id']) {
    metadata['video_id'] = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  return { metadata, metrics };
}

export default function UploadForm() {
  const [sourceType, setSourceType] = useState<SourceType>('brand');
  const [isUploading, setIsUploading] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<DateRange | undefined>(undefined);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    detail?: string;
  }>({ type: null, message: '' });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!reportPeriod?.from || !reportPeriod?.to) {
      setUploadStatus({
        type: 'error',
        message: 'Vui lòng chọn kỳ báo cáo trước khi upload.',
        detail: 'Chọn ngày bắt đầu và kết thúc của kỳ báo cáo (VD: 01/04 → 21/04).'
      });
      e.target.value = '';
      return;
    }

    const periodStart = format(reportPeriod.from, 'yyyy-MM-dd');
    const periodEnd = format(reportPeriod.to, 'yyyy-MM-dd');

    setIsUploading(true);
    setUploadStatus({ type: null, message: '' });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (rawRows.length === 0) {
          setUploadStatus({ type: 'error', message: 'File không có dữ liệu.' });
          return;
        }

        // Header row detection
        let headerRowIndex = 0;
        let maxMatches = 0;

        for (let i = 0; i < Math.min(15, rawRows.length); i++) {
          const row = rawRows[i];
          if (!Array.isArray(row)) continue;

          let matches = 0;
          row.forEach(cell => {
            const cellStr = normalizeHeader(String(cell || ''));
            if (COLUMN_MAPPING[cellStr]) matches++;
          });

          if (matches > maxMatches) {
            maxMatches = matches;
            headerRowIndex = i;
          }
        }

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

        const { data: skuMappings } = await supabase
          .from('product_sku_mappings')
          .select('raw_name, product_id');

        const mappedRows = jsonData.map(row => mapRow(row, sourceType, skuMappings || []));

        if (mappedRows.length === 0) {
          throw new Error('Không có dữ liệu hợp lệ được trích xuất từ file.');
        }

        // Merge duplicates by video_id
        const videoMap = new Map<string, { metadata: Record<string, unknown>; metrics: Record<string, unknown> }>();
        let duplicateCount = 0;

        for (const { metadata, metrics } of mappedRows) {
          const vid = String(metadata['video_id']);
          const existing = videoMap.get(vid);

          if (existing) {
            duplicateCount++;
            // Sum metric fields
            for (const field of METRIC_FIELDS) {
              existing.metrics[field] = ((existing.metrics[field] as number) || 0) + ((metrics[field] as number) || 0);
            }
            // Keep first non-null metadata
            for (const [key, val] of Object.entries(metadata)) {
              if (key === 'raw_data') continue;
              if (val != null && val !== '' && (existing.metadata[key] == null || existing.metadata[key] === '')) {
                existing.metadata[key] = val;
              }
            }
          } else {
            videoMap.set(vid, { metadata: { ...metadata }, metrics: { ...metrics } });
          }
        }

        const mergedEntries = Array.from(videoMap.values());

        // Step 1: Upsert metadata into videos table
        const BATCH_SIZE = 200;
        const metadataBatch = mergedEntries.map(e => e.metadata);

        for (let i = 0; i < metadataBatch.length; i += BATCH_SIZE) {
          const batch = metadataBatch.slice(i, i + BATCH_SIZE);
          const { error } = await supabase
            .from('videos')
            .upsert(batch, { onConflict: 'video_id' });

          if (error) {
            console.error('Metadata batch error:', error);
            throw new Error(`Lỗi lưu metadata (Batch ${Math.floor(i / BATCH_SIZE) + 1}): ${error.message}`);
          }
        }

        // Step 2: Upsert metrics into video_period_metrics table
        const metricsBatch = mergedEntries.map(e => ({
          video_id: e.metadata['video_id'],
          period_start: periodStart,
          period_end: periodEnd,
          ...e.metrics,
        }));

        for (let i = 0; i < metricsBatch.length; i += BATCH_SIZE) {
          const batch = metricsBatch.slice(i, i + BATCH_SIZE);
          const { error } = await supabase
            .from('video_period_metrics')
            .upsert(batch, { onConflict: 'video_id,period_start,period_end' });

          if (error) {
            console.error('Metrics batch error:', error);
            throw new Error(`Lỗi lưu metrics (Batch ${Math.floor(i / BATCH_SIZE) + 1}): ${error.message}`);
          }
        }

        // Step 3: Log upload history
        await supabase.from('upload_history').insert({
          file_name: file.name,
          source_type: sourceType,
          row_count: jsonData.length,
          success_count: mergedEntries.length,
          error_count: 0,
        });

        const mergeInfo = duplicateCount > 0
          ? ` (${duplicateCount} dòng trùng ID đã được cộng tổng)`
          : '';

        setUploadStatus({
          type: 'success',
          message: `Tải lên thành công ${mergedEntries.length} video!${mergeInfo}`,
          detail: `File: ${file.name} | Kỳ: ${format(reportPeriod.from!, 'dd/MM/yyyy')} → ${format(reportPeriod.to!, 'dd/MM/yyyy')} | Nguồn: ${sourceType === 'brand' ? 'Thương hiệu' : 'KOC/Affiliate'}`
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
      {/* Source type selector */}
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

      {/* Report period selector */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 text-foreground">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          Kỳ báo cáo <span className="text-red-400">*</span>
        </h3>
        <p className="text-xs text-[#94a3b8] mb-4">
          Chọn khoảng thời gian của dữ liệu trong file Excel (VD: từ TikTok Seller Center cho kỳ 01/04 → 21/04).
        </p>
        <div className="flex items-center gap-3">
          <DateRangePicker date={reportPeriod} setDate={setReportPeriod} />
          {reportPeriod?.from && reportPeriod?.to && (
            <span className="text-xs text-emerald-400 font-semibold">
              {format(reportPeriod.from, 'dd/MM/yyyy')} → {format(reportPeriod.to, 'dd/MM/yyyy')}
            </span>
          )}
          {(!reportPeriod?.from || !reportPeriod?.to) && (
            <span className="text-xs text-amber-400 font-medium">Chưa chọn kỳ báo cáo</span>
          )}
        </div>
      </div>

      {/* Upload area */}
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
            : !reportPeriod?.from || !reportPeriod?.to
            ? 'bg-[#30363d] cursor-not-allowed opacity-60'
            : sourceType === 'brand'
            ? 'bg-emerald-600 hover:bg-emerald-500'
            : 'bg-[#8b5cf6] hover:bg-[#7c3aed]'
        }`}>
          <input
            type="file"
            className="hidden"
            accept=".xlsx,.csv,.xls"
            onChange={handleFileUpload}
            disabled={isUploading || !reportPeriod?.from || !reportPeriod?.to}
          />
          {isUploading ? 'Đang xử lý...' : !reportPeriod?.from || !reportPeriod?.to ? 'Chọn kỳ báo cáo trước' : 'Chọn file từ máy tính'}
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
                <span className="text-xs text-red-500/80 break-all text-left">{uploadStatus.detail}</span>
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
