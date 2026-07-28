'use client';

import React, { useState } from 'react';
import { Mail, KeyRound } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export default function ForgotPasswordDialog({ isOpen, onClose, defaultEmail = '' }: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const handleClose = () => {
    setEmail(defaultEmail);
    setMsg('');
    setIsError(false);
    setSending(false);
    onClose();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setSending(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMsg(data.error || 'Có lỗi xảy ra, vui lòng thử lại.');
        setIsError(true);
      } else {
        setMsg('Đã gửi mật khẩu mới! Vui lòng kiểm tra hộp thư (kể cả mục Spam).');
        setIsError(false);
      }
    } catch {
      setMsg('Không kết nối được tới máy chủ. Vui lòng thử lại.');
      setIsError(true);
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center">
            <KeyRound className="w-4 h-4 text-[#8b5cf6]" />
          </div>
          <h3 className="font-semibold text-white">Khôi phục mật khẩu</h3>
        </div>
        <p className="text-[#94a3b8] text-xs mb-5">
          Nhập email đăng nhập. Hệ thống sẽ gửi mật khẩu mới về hộp thư của bạn.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@decoco.vn"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] text-white rounded-xl text-sm outline-none focus:border-[#8b5cf6]"
              />
            </div>
          </div>

          {msg && (
            <div className={`px-3 py-2.5 rounded-xl text-xs font-medium ${isError ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {msg}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-[#30363d] rounded-xl text-sm text-[#94a3b8] hover:text-white transition-colors"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold hover:bg-[#7c3aed] disabled:opacity-50 transition-colors"
            >
              {sending ? 'Đang gửi...' : 'Gửi mật khẩu mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
