'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordDialog({ isOpen, onClose }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setMsg('');
    setIsError(false);
    onClose();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');

    if (newPassword.length < 6) {
      setMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      setIsError(true);
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg('Xác nhận mật khẩu không khớp.');
      setIsError(true);
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (error) {
      setMsg('Lỗi: ' + error.message);
      setIsError(true);
    } else {
      setMsg('Đổi mật khẩu thành công!');
      setIsError(false);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => handleClose(), 1500);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center">
            <KeyRound className="w-4 h-4 text-[#8b5cf6]" />
          </div>
          <h3 className="font-semibold text-white">Đổi mật khẩu</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                required
                className="w-full pr-10 pl-4 py-2.5 bg-[#0d1117] border border-[#30363d] text-white rounded-xl text-sm outline-none focus:border-[#8b5cf6]"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94a3b8]"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Xác nhận mật khẩu</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                required
                className="w-full pr-10 pl-4 py-2.5 bg-[#0d1117] border border-[#30363d] text-white rounded-xl text-sm outline-none focus:border-[#8b5cf6]"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94a3b8]"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold hover:bg-[#7c3aed] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Đang lưu...' : 'Cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
