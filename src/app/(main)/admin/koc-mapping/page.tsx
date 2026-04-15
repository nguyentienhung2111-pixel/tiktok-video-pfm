'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile, Video } from '@/types';
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Save, UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface KOCStaffMapping {
  creatorId: string;
  creatorName: string;
  assignedUserId: string | null;
  videoCount: number;
  totalGMV: number;
}

export default function KOCMappingPage() {
  const [mappings, setMappings] = useState<KOCStaffMapping[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch all KOC videos to group by creator
      const { data: videos, error: vError } = await supabase
        .from('videos')
        .select('creator_id, creator_name, assigned_user_id, gmv')
        .eq('source_type', 'koc');

      if (vError) throw vError;

      // 2. Group and aggregate
      const kocGroups = new Map<string, KOCStaffMapping>();
      videos?.forEach(v => {
        const id = v.creator_id || 'unknown';
        const current = kocGroups.get(id) || {
          creatorId: id,
          creatorName: v.creator_name || 'N/A',
          assignedUserId: v.assigned_user_id,
          videoCount: 0,
          totalGMV: 0
        };
        kocGroups.set(id, {
          ...current,
          videoCount: current.videoCount + 1,
          totalGMV: current.totalGMV + (v.gmv || 0)
        });
      });

      setMappings(Array.from(kocGroups.values()).sort((a, b) => b.totalGMV - a.totalGMV));

      // 3. Fetch Staff
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'leader_booking', 'staff_booking'])
        .eq('is_active', true);

      if (pError) throw pError;
      setStaff(profiles || []);

    } catch (err: any) {
      setMsg({ type: 'error', text: 'Lỗi tải dữ liệu: ' + err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(creatorId: string, userId: string) {
    if (creatorId === 'unknown') return;
    setSaving(creatorId);
    try {
      // Update all videos for this creator
      const { error } = await supabase
        .from('videos')
        .update({ assigned_user_id: userId === 'none' ? null : userId })
        .eq('creator_id', creatorId);

      if (error) throw error;

      setMsg({ type: 'success', text: 'Đã cập nhật nhân viên phụ trách!' });
      setMappings(prev => prev.map(m => 
        m.creatorId === creatorId ? { ...m, assignedUserId: userId === 'none' ? null : userId } : m
      ));
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Lỗi khi lưu: ' + err.message });
    } finally {
      setSaving(null);
    }
  }

  const filteredMappings = mappings.filter(m => 
    m.creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.creatorId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader 
        title="Quản lý Booking KOC" 
        subtitle="Phân bổ KOC/Affiliate cho nhân viên phụ trách"
      />

      <div className="p-6 space-y-6">
        {msg && (
          <div className={cn(
            "p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
            msg.type === 'success' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
          )}>
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">{msg.text}</span>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Tìm kiếm KOC theo tên hoặc ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#161b22] border-[#30363d]"
            />
          </div>
          <Button variant="outline" className="border-[#30363d]" onClick={fetchData}>
            Làm mới dữ liệu
          </Button>
        </div>

        <Card className="border-[#30363d] bg-[#161b22]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Danh sách KOC & Phân bổ nhân viên ({filteredMappings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Đang tải danh sách KOC...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#30363d] text-[10px] uppercase font-bold text-muted-foreground bg-[#0d1117]/50">
                      <th className="px-4 py-3">KOC / Affiliate</th>
                      <th className="px-4 py-3">ID Hệ thống</th>
                      <th className="px-4 py-3 text-right">Tổng Clip</th>
                      <th className="px-4 py-3 text-right">Tổng GMV</th>
                      <th className="px-4 py-3">Nhân viên phụ trách</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363d]">
                    {filteredMappings.map((m) => (
                      <tr key={m.creatorId} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-bold text-white">{m.creatorName}</div>
                        </td>
                        <td className="px-4 py-4 text-xs font-mono text-[#94a3b8]">
                          {m.creatorId}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Badge variant="outline" className="border-[#30363d]">{m.videoCount}</Badge>
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-emerald-500">
                          {formatCurrency(m.totalGMV)}
                        </td>
                        <td className="px-4 py-4 w-[280px]">
                          <div className="flex items-center gap-2">
                            <Select 
                              value={m.assignedUserId || 'none'} 
                              onValueChange={(val) => handleAssign(m.creatorId, val)}
                              disabled={saving === m.creatorId}
                            >
                              <SelectTrigger className="bg-[#0d1117] border-[#30363d] h-9">
                                <SelectValue placeholder="Chọn nhân viên..." />
                              </SelectTrigger>
                              <SelectContent className="bg-[#161b22] border-[#30363d] text-white">
                                <SelectItem value="none">Chưa phân bổ</SelectItem>
                                {staff.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {saving === m.creatorId && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredMappings.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-20 text-center text-muted-foreground">
                          Không tìm thấy dữ liệu KOC. Vui lòng upload file từ TikTok Shop.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
