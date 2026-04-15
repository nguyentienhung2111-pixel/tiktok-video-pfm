'use client';

import React, { useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types';
import { UserPlus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

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

export default function AccountsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', display_name: '', role: 'staff_content' as UserRole });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    if (data) setProfiles(data as Profile[]);
    setLoading(false);
  }

  async function createUser() {
    if (!newUser.username.trim() || !newUser.display_name.trim()) {
      setMsg('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').insert(newUser);
    if (error) {
      setMsg('Lỗi: ' + error.message);
    } else {
      setMsg('Tạo tài khoản thành công!');
      setNewUser({ username: '', display_name: '', role: 'staff_content' });
      setShowForm(false);
      fetchProfiles();
      setTimeout(() => setMsg(''), 3000);
    }
    setSaving(false);
  }

  async function toggleActive(profile: Profile) {
    await supabase.from('profiles').update({ is_active: !profile.is_active }).eq('id', profile.id);
    setProfiles(p => p.map(u => u.id === profile.id ? { ...u, is_active: !u.is_active } : u));
  }

  async function deleteUser(id: string) {
    if (!confirm('Xoá tài khoản này? Thao tác không thể hoàn tác.')) return;
    await supabase.from('profiles').delete().eq('id', id);
    setProfiles(p => p.filter(u => u.id !== id));
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
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold hover:bg-[#7c3aed] transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Thêm tài khoản
          </button>
        </div>

        {showForm && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold">Tạo tài khoản mới</h3>
            <div className="grid grid-cols-3 gap-4">
              <input
                placeholder="Username (không dấu)"
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
              <select
                value={newUser.role}
                onChange={e => setNewUser(u => ({ ...u, role: e.target.value as UserRole }))}
                className="bg-[#0d1117] border border-[#30363d] text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#8b5cf6]"
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-[#30363d] rounded-xl text-sm">Hủy</button>
              <button onClick={createUser} disabled={saving} className="px-5 py-2 bg-[#8b5cf6] text-white rounded-xl text-sm font-semibold disabled:opacity-50">
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
                <th className="p-4 text-left text-[0.7rem] uppercase text-[#94a3b8] font-semibold tracking-wider">Username</th>
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
                  <td className="p-4 font-mono text-xs text-[#94a3b8]">{p.username}</td>
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
                  <td className="p-4 text-center">
                    <button onClick={() => deleteUser(p.id)} className="text-[#94a3b8] hover:text-[#ef4444] transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
