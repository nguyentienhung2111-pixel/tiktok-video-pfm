'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DeleteAllDataButton() {
  const [status, setStatus] = useState<'idle' | 'confirming' | 'deleting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleDelete = async () => {
    if (status === 'idle') {
      setStatus('confirming');
      return;
    }

    if (status !== 'confirming') return;

    setStatus('deleting');
    setMessage('Đang xoá toàn bộ dữ liệu video...');

    try {
      // Delete all rows from videos table
      // Use neq on a non-nullable field to match all rows
      const { error } = await supabase
        .from('videos')
        .delete()
        .neq('video_id', '');

      if (error) throw error;

      // Also clear upload history
      const { error: historyError } = await supabase
        .from('upload_history')
        .delete()
        .neq('file_name', '');

      if (historyError) {
        console.warn('Could not clear upload_history:', historyError);
      }

      setStatus('success');
      setMessage('Đã xoá toàn bộ dữ liệu video thành công!');
    } catch (error: any) {
      console.error('Delete error:', error);
      setStatus('error');
      setMessage(`Lỗi: ${error.message || 'Không xác định'}`);
    }
  };

  const handleCancel = () => {
    setStatus('idle');
    setMessage('');
  };

  return (
    <div className="bg-[#161b22] border border-red-500/30 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-red-400">Xoá toàn bộ dữ liệu</h3>
          <p className="text-xs text-[#94a3b8] mt-1">
            Xoá tất cả video đã tải lên. Hành động này không thể hoàn tác.
          </p>
        </div>

        {status === 'idle' && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-500 text-white transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Xoá tất cả
          </button>
        )}

        {status === 'confirming' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-xl font-semibold text-sm border border-[#30363d] text-[#94a3b8] hover:text-white transition-all"
            >
              Huỷ
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-500 text-white transition-all animate-pulse"
            >
              <AlertTriangle className="w-4 h-4" />
              Xác nhận xoá
            </button>
          </div>
        )}

        {status === 'deleting' && (
          <div className="flex items-center gap-2 text-[#94a3b8] text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang xoá...
          </div>
        )}
      </div>

      {status === 'confirming' && (
        <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Bạn có chắc chắn? Toàn bộ dữ liệu video sẽ bị xoá vĩnh viễn!</span>
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
