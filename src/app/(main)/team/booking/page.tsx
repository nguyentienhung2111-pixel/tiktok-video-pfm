'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, UserCheck, FileDown, Loader2, Star, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Video, Profile } from '@/types';
import { VideoTable } from '@/components/VideoTable';
import { useUser } from '@/components/user-context';
import DashboardHeader from '@/components/DashboardHeader';
import { DateRangePicker } from '@/components/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays, startOfToday } from 'date-fns';
import { toPng } from 'html-to-image';
import FilterBar, { FilterState } from '@/components/FilterBar';
import { Leaderboard, LeaderboardEntry } from '@/components/Leaderboard';

const INITIAL_FILTERS: FilterState = {
  search: '',
  productId: '',
  tagIds: [],
  minGMV: '',
  minViews: '',
  sourceType: 'koc', 
};

export default function BookingTeamPage() {
  const { user } = useUser();
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(startOfToday(), 14),
    to: startOfToday(),
  });

  const dashboardRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('videos')
        .select('*')
        .eq('source_type', 'koc')
        .order('published_at', { ascending: false });

      // Apply Date Filter (Using YYYY-MM-DD format for DATE column)
      if (date?.from) {
        const fromDate = new Date(date.from);
        const year = fromDate.getFullYear();
        const month = String(fromDate.getMonth() + 1).padStart(2, '0');
        const day = String(fromDate.getDate()).padStart(2, '0');
        query = query.gte('published_at', `${year}-${month}-${day}`);
      }
      if (date?.to) {
        const toDate = new Date(date.to);
        const year = toDate.getFullYear();
        const month = String(toDate.getMonth() + 1).padStart(2, '0');
        const day = String(toDate.getDate()).padStart(2, '0');
        query = query.lte('published_at', `${year}-${month}-${day}`);
      }

      if (filters.productId) query = query.eq('product_id', filters.productId);
      if (filters.minGMV) query = query.gte('gmv', parseInt(filters.minGMV));
      if (filters.minViews) query = query.gte('views', parseInt(filters.minViews));
      if (filters.search) {
        query = query.or(`video_title.ilike.%${filters.search}%,creator_name.ilike.%${filters.search}%`);
      }

      const { data: videoData, error: videoError } = await query;
      if (videoError) throw videoError;

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true);
      if (userError) throw userError;

      setVideos((videoData as Video[]) || []);
      setUsers((userData as Profile[]) || []);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu KOC:', error);
    } finally {
      setLoading(false);
    }
  }, [date, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kocLeaderboard = useMemo(() => {
    const kocMap = new Map<string, { name: string, gmv: number, videos: number }>();
    
    videos.forEach(v => {
      const id = v.creator_id || 'unknown';
      const current = kocMap.get(id) || { name: v.creator_name || 'Hợp tác viên', gmv: 0, videos: 0 };
      kocMap.set(id, {
        name: current.name,
        gmv: current.gmv + (v.gmv || 0),
        videos: current.videos + 1
      });
    });

    return Array.from(kocMap.entries())
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        value: stats.gmv,
        subtitle: `${stats.videos} videos clip`
      } as LeaderboardEntry))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [videos]);

  const staffLeaderboard = useMemo(() => {
    const staffMap = new Map<string, { gmv: number, kocCount: Set<string> }>();
    
    videos.forEach(v => {
      if (!v.assigned_user_id) return;
      const current = staffMap.get(v.assigned_user_id) || { gmv: 0, kocCount: new Set() };
      staffMap.set(v.assigned_user_id, {
        gmv: current.gmv + (v.gmv || 0),
        kocCount: current.kocCount.add(v.creator_id || 'unknown')
      });
    });

    return Array.from(staffMap.entries())
      .map(([uid, stats]) => {
        const profile = users.find(u => u.id === uid);
        return {
          id: uid,
          name: profile?.display_name || 'Nhân viên',
          value: stats.gmv,
          subtitle: `Phụ trách ${stats.kocCount.size} KOCs`
        } as LeaderboardEntry;
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [videos, users]);

  const totalGMV = videos.reduce((sum, v) => sum + (v.gmv || 0), 0);
  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalOrders = videos.reduce((sum, v) => sum + (v.orders || 0), 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  const scorecards = [
    { label: 'GMV từ KOC', value: formatCurrency(totalGMV), change: '+8.2%', up: true },
    { label: 'Đơn hàng KOC', value: formatNumber(totalOrders), change: '+4.5%', up: true },
    { label: 'Số KOC đã lên clip', value: new Set(videos.map(v => v.creator_id)).size.toString(), change: '+2', up: true },
    { label: 'Tổng lượt xem KOC', value: formatNumber(totalViews), change: '+12.1%', up: true },
  ];

  const handleExport = async () => {
    if (dashboardRef.current === null) return;
    try {
      const dataUrl = await toPng(dashboardRef.current, { 
        cacheBust: true, 
        backgroundColor: '#0d1117',
        pixelRatio: 2,
        filter: (node: HTMLElement) => {
          const exclusionClasses = ['DateRangePicker', 'Button', 'export-ignore', 'FilterBar'];
          return !exclusionClasses.some(cls => node.classList?.contains(cls));
        }
      });
      const link = document.createElement('a');
      link.download = `koc-report-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Lỗi khi xuất báo cáo:', err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader 
        title="KOC / Affiliate Performance" 
        subtitle="Hiệu quả chiến dịch Influencer Marketing"
      >
        <div className="flex items-center gap-3">
          <DateRangePicker date={date} setDate={setDate} />
          <Button size="sm" variant="outline" onClick={handleExport} className="export-ignore border-[#30363d] text-[#94a3b8] hover:text-white">
            <FileDown className="mr-2 h-4 w-4" />
            Lưu báo cáo
          </Button>
        </div>
      </DashboardHeader>

      <div className="p-6 space-y-8" ref={dashboardRef}>
        <div className="export-ignore">
          <FilterBar 
            filters={filters} 
            setFilters={setFilters} 
            onClear={() => setFilters(INITIAL_FILTERS)} 
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {scorecards.map((item) => (
            <Card key={item.label} className="border-[#30363d] bg-[#161b22] hover:border-purple-500/50 transition-all">
              <CardContent className="p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">{item.label}</p>
                <p className="mt-2 text-3xl font-black text-white">{item.value}</p>
                <div className="mt-2 flex items-center gap-1">
                  {item.up ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
                  <span className={cn("text-xs font-bold", item.up ? "text-emerald-500" : "text-red-500")}>{item.change}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Leaderboards Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Leaderboard 
            title="TOP KOC / Affiliate"
            entityType="koc"
            entries={kocLeaderboard}
            valueLabel={formatCurrency}
          />
          <Leaderboard 
            title="TOP Nhân viên Booking"
            entityType="staff"
            entries={staffLeaderboard}
            valueLabel={formatCurrency}
          />
        </div>

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h2 className="text-xl font-black flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-500" />
            Chi tiết video từ KOC ({videos.length})
          </h2>
          {loading ? (
             <div className="h-64 flex flex-col items-center justify-center border border-[#30363d] rounded-2xl bg-[#161b22] gap-4">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
                <p className="text-sm text-[#94a3b8] uppercase font-bold tracking-tighter">Đang tải dữ liệu KOC...</p>
             </div>
          ) : videos.length === 0 ? (
            <Card className="border-[#30363d] bg-[#161b22] border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <UserCheck className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-bold">Chưa có dữ liệu KOC thỏa mãn lọc</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">Thay đổi lọc hoặc upload thêm dữ liệu nguồn 'KOC'</p>
                <Button variant="outline" className="mt-6 border-[#30363d]" onClick={() => setFilters(INITIAL_FILTERS)}>
                  Xóa tất cả bộ lọc
                </Button>
              </CardContent>
            </Card>
          ) : (
            <VideoTable videos={videos} users={users} onRefresh={fetchData} />
          )}
        </div>
      </div>
    </div>
  );
}
