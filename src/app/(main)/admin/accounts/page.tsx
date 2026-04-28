'use client';

import React, { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types';
import { UserPlus, Trash2, ToggleLeft, ToggleRight, KeyRound, Eye, EyeOff } from 'lucide-react';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Quản trị viên' },
  { value: 'leader_content', label: 'Leader Content' },
  { value: 'leader_booking', label: 'Leader Booking' },
  { value: 'staff_content', label: 'Staff Content' },
  { value: 'staff_booking', label: 'Staff Booking' },
];

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-500/15 text-red-400 border-red-500/30',
  leader_content: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  leader_booking: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  staff_content: 'bg-[#94a3b8]/15 text-[#94a3b8] border-[#94a3b8]/30',
  staff_booking: 'bg-[#94a3b8]/15 text-[#94a3b8] border-[#94a3b8]/30',
};

interface ResetPasswordState {
  userId: string;
  displayName: string;
  newPassword: string;
  confirmPassword: string;
  showPwd: boolean;
}

export default function AccountsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    display_name: '',
    email: '',
    password: '',
    role: 'staff_content' as UserRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [resetState, setResetState] = useState<ResetPasswordState | null>(null);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [resetError, setResetError] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    if (data) setProfiles(data as Profile[]);
    setLoading(false);
  }

  async function createUser() {
    if (!newUser.username.trim() || !newUser.display_name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      setMsg('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (newUser.password.length < 6) {
      setMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    setSaving(true);
    setMsg('');

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    const json = await res.json();

    if (!res.ok) {
      setMsg('Lỗi: ' + (json.error || 'Không thể tạo tài khoản.'));
    } else {
      setMsg('Tạo tài khoản thành công!');
      setNewUser({ username: '', display_name: '', email: '', password: '', role: 'staff_content' });
      setShowForm(false);
      setShowPassword(false);
      fetchProfiles();
      setTimeout(() => setMsg(''), 3000);
    }
    setSaving(false);
  }

  async function toggleActive(profile: Profile) {
    await supabase.from('profiles').update({ is_active: !profile.is_active }).eq('id', profile.id);
    setProfiles(p => p.map(u => u.id === profile.id ? { ...u, is_active: !u.is_active } : u));
  }

  async function deleteUser(profile: Profile) {
    if (!confirm(`Xoá tài khoản "${profile.display_name}"? Thao tác không thể hoàn tác.`)) return;

    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id }),
    });
    const json = await res.json();

    if (!res.ok) {
      setMsg('Lỗi xoá: ' + (json.error || 'Không thể xoá tài khoản.'));
    } else {
      setProfiles(p => p.filter(u => u.id !== profile.id));
    }
  }

  function openResetPassword(profile: Profile) {
    setResetState({
      userId: profile.id,
      displayName: profile.display_name,
      newPassword: '',
      confirmPassword: '',
      showPwd: false,
    });
    setResetMsg('');
    setResetError(false);
  }

  async function submitResetPassword() {
    if (!resetState) return;
    setResetMsg('');
    if (resetState.newPassword.length < 6) {
      setResetMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      setResetError(true);
      return;
    }
    if (resetState.newPassword !== resetState.confirmPassword) {
      setResetMsg('Xác nhận mật khẩu không khớp.');
      setResetError(true);
      return;
    }
    setResetSaving(true);

    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: resetState.userId, newPassword: resetState.newPassword }),
    });
    const json = await res.json();
    setResetSaving(false);

    if (!res.ok) {
      setResetMsg('Lỗi: ' + (json.error || 'Không thể đặt lại mật khẩu.'));
      setResetError(true);
    } else {
      setResetMsg('Đặt lại mật khẩu thành công!');
      setResetError(false);
      setTimeout(() => setResetState(null), 1500);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Quản lý Tài khoản"
        subtitle="Thêm, sửa và phân quyền nhân sự trong hệ thống."
      />

      <div className="p-12 space-y-6 animate-in fade-in duration-500 max-w-5xl">
        {msg && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium ${msg.includes('Lỗi') ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {msg}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => { setShowForm(!showForm); setMsg(''); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold hover:bg-[#7c3aed] transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Thêm tài khoản
          </button>
        </div>

        {showForm && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold">Tạo tài khoản mới</h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="Username (không dấu, không khoảng cách)"
                value={newUser.username}
                onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
                className="bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#8b5cf6]"
              />
              <input
                placeholder="Tên hiển thị"
                value={newUser.display_name}
                onChange={e => setNewUser(u => ({ ...u, display_name: e.target.value }))}
                className="bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#8b5cf6]"
              />
              <input
                type="email"
                placeholder="Email đăng nhập"
                value={newUser.email}
                onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                className="bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#8b5cf6]"
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                  value={newUser.password}
                  onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 pr-10 py-2.5 text-sm outline-none focus:border-[#8b5cf6]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94a3b8]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <select
                value={newUser.role}
                onChange={e => setNewUser(u => ({ ...u, role: e.target.value as UserRole }))}
                className="bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#8b5cf6] col-span-2"
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowForm(false); setMsg(''); }} className="px-4 py-2 border border-[#30363d] rounded-xl text-sm text-[#94a3b8] hover:text-white transition-colors">Hủy</button>
              <button onClick={createUser} disabled={saving} className="px-5 py-2 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-[#7c3aed] transition-colors">
                {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0d1117] border-b border-[#30363d]">
                <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-semibold tracking-wider">Tên hiển thị</th>
                <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-semibold tracking-wider">Username / Email</th>
                <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-semibold tracking-wider">Vai trò</th>
                <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-semibold tracking-wider">Trạng thái</th>
                <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-semibold tracking-wider">Ngày tạo</th>
                <th className="p-4 text-center text-[0.7rem] uppercase text-[#94a3b8] font-semibold tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-[#94a3b8] animate-pulse">Đang tải...</td></tr>
              ) : profiles.map((p, i) => (
                <tr key={p.id} className={`border-b border-[#30363d] hover:bg-white/[0.02] ${i % 2 ? 'bg-white/[0.01]' : ''}`}>
                  <td className="p-4 font-medium">{p.display_name}</td>
                  <td className="p-4">
                    <span className="font-mono text-xs text-[#94a3b8] block">{p.username}</span>
                    {p.email && <span className="text-xs text-[#64748b] block mt-0.5">{p.email}</span>}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-[0.65rem] font-bold uppercase border ${ROLE_COLORS[p.role]}`}>
                      {ROLES.find(r => r.value === p.role)?.label || p.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <button onClick={() => toggleActive(p)} className="flex items-center gap-1.5 text-xs">
                      {p.is_active
                        ? <><ToggleRight className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Hoạt động</span></>
                        : <><ToggleLeft className="w-4 h-4 text-[#94a3b8]" /><span className="text-[#94a3b8]">Tắt</span></>
                      }
                    </button>
                  </td>
                  <td className="p-4 text-xs text-[#94a3b8]">
                    {new Date(p.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openResetPassword(p)}
                        title="Đặt lại mật khẩu"
                        className="text-[#94a3b8] hover:text-[#8b5cf6] transition-colors p-1.5 rounded-lg hover:bg-[#8b5cf6]/10"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteUser(p)}
                        title="Xoá tài khoản"
                        className="text-[#94a3b8] hover:text-[#ef4444] transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Password Dialog */}
      {resetState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-[#8b5cf6]" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Đặt lại mật khẩu</h3>
                <p className="text-xs text-[#94a3b8]">{resetState.displayName}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type={resetState.showPwd ? 'text' : 'password'}
                  placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                  value={resetState.newPassword}
                  onChange={e => setResetState(s => s ? { ...s, newPassword: e.target.value } : s)}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 pr-10 py-2.5 text-sm outline-none focus:border-[#8b5cf6]"
                />
                <button
                  type="button"
                  onClick={() => setResetState(s => s ? { ...s, showPwd: !s.showPwd } : s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94a3b8]"
                >
                  {resetState.showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type={resetState.showPwd ? 'text' : 'password'}
                placeholder="Xác nhận mật khẩu"
                value={resetState.confirmPassword}
                onChange={e => setResetState(s => s ? { ...s, confirmPassword: e.target.value } : s)}
                className="w-full bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#8b5cf6]"
              />
            </div>

            {resetMsg && (
              <div className={`mt-3 px-3 py-2.5 rounded-xl text-xs font-medium ${resetError ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {resetMsg}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setResetState(null)}
                className="px-4 py-2 border border-[#30363d] rounded-xl text-sm text-[#94a3b8] hover:text-white transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={submitResetPassword}
                disabled={resetSaving}
                className="px-5 py-2 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold hover:bg-[#7c3aed] disabled:opacity-50 transition-colors"
              >
                {resetSaving ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
