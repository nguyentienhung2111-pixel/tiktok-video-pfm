'use client';

import React, { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { extractFieldsFromRaw } from './UploadForm';

interface ReprocessStatus {
  type: 'idle' | 'processing' | 'success' | 'error';
  message: string;
  processed?: number;
  total?: number;
}

export default function ReprocessDataButton() {
  const [status, setStatus] = useState<ReprocessStatus>({ type: 'idle', message: '' });

  const handleReprocess = async () => {
    if (status.type === 'processing') return;
    
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn xử lý lại toàn bộ dữ liệu?\n\n' +
      'Hệ thống sẽ đọc lại cột gốc từ raw_data và cập nhật các trường: views, gmv, orders, likes, comments, shares...\n\n' +
      'Quá trình này có thể mất vài phút.'
    );
    if (!confirmed) return;

    setStatus({ type: 'processing', message: 'Đang đếm tổng số bản ghi...', processed: 0, total: 0 });

    try {
      // Get total count
      const { count: totalCount, error: countError } = await supabase
        .from('videos')
        .select('id', { count: 'exact', head: true });
      
      if (countError) throw countError;
      const total = totalCount || 0;
      setStatus({ type: 'processing', message: 'Đang xử lý...', processed: 0, total });

      const BATCH_SIZE = 100;
      let processed = 0;
      let offset = 0;

      while (offset < total) {
        // Fetch batch with raw_data
        const { data: batch, error: fetchError } = await supabase
          .from('videos')
          .select('id, video_id, raw_data')
          .range(offset, offset + BATCH_SIZE - 1)
          .order('id');
        
        if (fetchError) throw fetchError;
        if (!batch || batch.length === 0) break;

        // Process each record
        for (const record of batch) {
          if (!record.raw_data) continue;

          const extracted = extractFieldsFromRaw(record.raw_data as Record<string, unknown>);
          
          // Only update numeric fields + published_at from raw_data
          const updateData: Record<string, unknown> = {};
          
          const fieldsToUpdate = [
            'views', 'gmv', 'orders', 'likes', 'comments', 'shares',
            'click_to_order_rate',
            'new_followers', 'impressions', 'reach', 'engagement',
            'published_at', 'creator_name', 'creator_id', 'video_title', 
            'product_name',
          ];

          for (const field of fieldsToUpdate) {
            if (extracted[field] !== undefined) {
              updateData[field] = extracted[field];
            }
          }

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from('videos')
              .update(updateData)
              .eq('id', record.id);
            
            if (updateError) {
              console.error(`Error updating video ${record.video_id}:`, updateError);
            }
          }
          
          processed++;
        }

        offset += batch.length;
        setStatus({ 
          type: 'processing', 
          message: `Đang xử lý... ${processed}/${total}`, 
          processed, 
          total 
        });
      }

      setStatus({ 
        type: 'success', 
        message: `Đã xử lý lại thành công ${processed} bản ghi!`, 
        processed, 
        total 
      });
    } catch (error: any) {
      console.error('Reprocess error:', error);
      setStatus({ 
        type: 'error', 
        message: `Lỗi: ${error.message || 'Không xác định'}` 
      });
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Xử lý lại dữ liệu</h3>
          <p className="text-xs text-[#94a3b8] mt-1">
            Đọc lại toàn bộ raw_data và cập nhật views, GMV, orders... từ cột gốc Excel.
          </p>
        </div>
        <button
          onClick={handleReprocess}
          disabled={status.type === 'processing'}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            status.type === 'processing'
              ? 'bg-[#30363d] text-[#94a3b8] cursor-not-allowed'
              : 'bg-amber-600 hover:bg-amber-500 text-white'
          }`}
        >
          {status.type === 'processing' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {status.type === 'processing' ? 'Đang xử lý...' : 'Xử lý lại'}
        </button>
      </div>

      {/* Progress Bar */}
      {status.type === 'processing' && status.total && status.total > 0 && (
        <div className="space-y-2">
          <div className="w-full bg-[#0d1117] rounded-full h-2 overflow-hidden">
            <div 
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, ((status.processed || 0) / status.total) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-[#94a3b8]">{status.message}</p>
        </div>
      )}

      {/* Success Message */}
      {status.type === 'success' && (
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{status.message}</span>
        </div>
      )}

      {/* Error Message */}
      {status.type === 'error' && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
}
