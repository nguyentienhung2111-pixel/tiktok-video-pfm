'use client';

import React, { useState, useEffect } from 'react';
import { Undo2, AlertTriangle, Loader2, CheckCircle, FileSpreadsheet, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UploadRecord {
  id: string;
  file_name: string;
  source_type: string;
  row_count: number;
  success_count: number;
  created_at: string;
}

interface DeleteLastUploadButtonProps {
  sourceType: 'brand' | 'koc';
}

export default function DeleteLastUploadButton({ sourceType }: DeleteLastUploadButtonProps) {
  const [lastUpload, setLastUpload] = useState<UploadRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'confirming' | 'deleting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const fetchLastUpload = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('upload_history')
        .select('*')
        .eq('source_type', sourceType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Fetch last upload error:', error);
      }
      setLastUpload(data || null);
    } catch {
      setLastUpload(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLastUpload();
    // Reset any transient confirm/success state when tab changes
    setStatus('idle');
    setMessage('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType]);

  const handleDelete = async () => {
    if (status === 'idle') {
      setStatus('confirming');
      return;
    }

    if (status !== 'confirming' || !lastUpload) return;

    setStatus('deleting');
    setMessage('Đang tìm và xoá dữ liệu lần upload gần nhất...');

    try {
      const uploadTime = new Date(lastUpload.created_at);
      // Videos created within a 30-second window around the upload timestamp
      const timeBefore = new Date(uploadTime.getTime() - 30 * 1000).toISOString();
      const timeAfter = new Date(uploadTime.getTime() + 30 * 1000).toISOString();

      let totalDeleted = 0;

      // Find and delete videos created in the upload window
      while (true) {
        const { data: batch, error: fetchError } = await supabase
          .from('videos')
          .select('id, video_id')
          .gte('created_at', timeBefore)
          .lte('created_at', timeAfter)
          .limit(500);

        if (fetchError) throw fetchError;
        if (!batch || batch.length === 0) break;

        const ids = batch.map((r) => r.id);
        const videoIds = batch.map((r) => r.video_id);

        // Delete associated period metrics first
        const { error: metricsError } = await supabase
          .from('video_period_metrics')
          .delete()
          .in('video_id', videoIds);

        if (metricsError) {
          console.error('Metrics delete error:', metricsError);
          // Continue even if metrics deletion fails (cascade should handle it)
        }

        // Delete videos
        const { error: delError } = await supabase
          .from('videos')
          .delete()
          .in('id', ids);

        if (delError) throw delError;

        totalDeleted += ids.length;
        setMessage(`Đã xoá ${totalDeleted} video...`);
      }

      // Delete the upload_history record
      const { error: historyError } = await supabase
        .from('upload_history')
        .delete()
        .eq('id', lastUpload.id);

      if (historyError) {
        console.error('History delete error:', historyError);
      }

      setStatus('success');
      setMessage(`Đã xoá thành công ${totalDeleted} video từ lần upload "${lastUpload.file_name}"!`);

      // Refresh to get the new last upload
      setTimeout(() => {
        fetchLastUpload();
        setStatus('idle');
        setMessage('');
      }, 3000);
    } catch (error: any) {
      console.error('Delete last upload error:', error);
      setStatus('error');
      setMessage(`Lỗi: ${error.message || 'Không xác định'}`);
    }
  };

  const handleCancel = () => {
    setStatus('idle');
    setMessage('');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        <div className="flex items-center gap-2 text-[#94a3b8] text-sm animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" />
          Đang tải thông tin upload...
        </div>
      </div>
    );
  }

  if (!lastUpload) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-amber-400">
              Xoá lần upload gần nhất ({sourceType === 'brand' ? 'Thương hiệu' : 'KOC / Affiliate'})
            </h3>
            <p className="text-xs text-[#94a3b8] mt-1">
              Chưa có dữ liệu upload nào cho tab này.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#161b22] border border-amber-500/30 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-400">
              Xoá lần upload gần nhất ({sourceType === 'brand' ? 'Thương hiệu' : 'KOC / Affiliate'})
            </h3>
          <p className="text-xs text-[#94a3b8] mt-1">
            Xoá tất cả video của lần upload gần nhất. Hành động này không thể hoàn tác.
          </p>

          {/* Last upload info */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#94a3b8]">
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400/70" />
              <span className="font-medium text-[#c9d1d9] truncate max-w-[200px]" title={lastUpload.file_name}>
                {lastUpload.file_name}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400/70" />
              {formatDate(lastUpload.created_at)}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">
              {lastUpload.success_count} video • {lastUpload.source_type === 'brand' ? 'Thương hiệu' : 'KOC'}
            </span>
          </div>
        </div>

        {status === 'idle' && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-amber-600 hover:bg-amber-500 text-white transition-all flex-shrink-0 ml-4"
          >
            <Undo2 className="w-4 h-4" />
            Xoá upload
          </button>
        )}

        {status === 'confirming' && (
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-xl font-semibold text-sm border border-[#30363d] text-[#94a3b8] hover:text-white transition-all"
            >
              Huỷ
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-amber-600 hover:bg-amber-500 text-white transition-all animate-pulse"
            >
              <AlertTriangle className="w-4 h-4" />
              Xác nhận xoá
            </button>
          </div>
        )}

        {status === 'deleting' && (
          <div className="flex items-center gap-2 text-[#94a3b8] text-sm flex-shrink-0 ml-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang xoá...
          </div>
        )}
      </div>

      {status === 'confirming' && (
        <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Bạn có chắc chắn? Tất cả video từ file &ldquo;{lastUpload.file_name}&rdquo; sẽ bị xoá!</span>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
