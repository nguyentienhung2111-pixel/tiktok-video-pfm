'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Loader2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface KOCStaffMapping {
  creatorId: string;
  creatorName: string;
  assignedUserId: string | null;
  videoCount: number;
  totalGMV: number;
}

type RpcRow = {
  creator_id: string;
  creator_name: string | null;
  assigned_user_id: string | null;
  video_count: number;
  total_gmv: number;
  total_count: number;
};

const SEARCH_DEBOUNCE_MS = 300;

export default function KOCMappingPage() {
  const [mappings, setMappings] = useState<KOCStaffMapping[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    fetchMappings();
  }, [page, pageSize, debouncedSearch]);

  async function fetchStaff() {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'leader_booking', 'staff_booking'])
      .eq('is_active', true);
    if (error) {
      setMsg({ type: 'error', text: 'Lỗi tải danh sách nhân viên: ' + error.message });
      return;
    }
    setStaff(profiles || []);
  }

  async function fetchMappings() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_koc_mappings_summary', {
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
        p_search: debouncedSearch || null,
      });
      if (error) throw error;

      const rows = (data ?? []) as RpcRow[];
      setMappings(
        rows.map((r) => ({
          creatorId: r.creator_id,
          creatorName: r.creator_name || 'N/A',
          assignedUserId: r.assigned_user_id,
          videoCount: Number(r.video_count) || 0,
          totalGMV: Number(r.total_gmv) || 0,
        }))
      );
      setTotalCount(rows.length > 0 ? Number(rows[0].total_count) || 0 : 0);
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

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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
          <Button variant="outline" className="border-[#30363d]" onClick={fetchMappings}>
            Làm mới dữ liệu
          </Button>
        </div>

        <Card className="border-[#30363d] bg-[#161b22]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Danh sách KOC & Phân bổ nhân viên ({totalCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Đang tải danh sách KOC...</p>
              </div>
            ) : (
              <>
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
                      {mappings.map((m) => (
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
                      {mappings.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-20 text-center text-muted-foreground">
                            {debouncedSearch
                              ? `Không tìm thấy KOC nào khớp với "${debouncedSearch}".`
                              : 'Không tìm thấy dữ liệu KOC. Vui lòng upload file từ TikTok Shop.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalCount > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 px-2 border-t border-[#30363d]">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} của {totalCount} KOC
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="bg-[#161b22] border border-[#30363d] text-xs font-bold py-1.5 px-3 rounded-lg focus:outline-none appearance-none pr-8 cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <option value={10}>10/Trang</option>
                        <option value={20}>20/Trang</option>
                        <option value={50}>50/Trang</option>
                        <option value={100}>100/Trang</option>
                      </select>

                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8 border-[#30363d] bg-transparent hover:bg-primary/10 disabled:opacity-30"
                          onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-bold text-foreground px-2">
                          Trang {page} / {totalPages}
                        </span>
                        <Button variant="outline" size="icon" className="h-8 w-8 border-[#30363d] bg-transparent hover:bg-primary/10 disabled:opacity-30"
                          onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
