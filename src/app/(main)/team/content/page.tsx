'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Tv, FileDown, Loader2, Package, ShoppingBag, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
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
  sourceType: 'brand', 
};

export default function ContentTeamPage() {
  const { user } = useUser();
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(startOfToday(), 365), 
    to: startOfToday(),
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [paginatedVideos, setPaginatedVideos] = useState<Video[]>([]);

  const dashboardRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('videos')
        .select('*', { count: 'exact' })
        .eq('source_type', 'brand');

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
        query = query.or(`video_title.ilike.%${filters.search}%`);
      }

      // Fetch ALL for summary/leaderboards (limit to 5000 to avoid crash)
      const { data: summaryData, error: summaryError } = await query.limit(5000);
      if (summaryError) throw summaryError;
      setVideos((summaryData as Video[]) || []);

      // Fetch Paginated for table
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data: videoData, error: videoError, count } = await query
        .order('gmv', { ascending: false })
        .range(from, to);
        
      if (videoError) throw videoError;

      if (count !== null) setTotalCount(count);
      setPaginatedVideos((videoData as Video[]) || []);

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true);
      if (userError) throw userError;

      setUsers((userData as Profile[]) || []);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu Thương hiệu:', error);
    } finally {
      setLoading(false);
    }
  }, [date, filters, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate Leaderboards
  const productLeaderboard = useMemo(() => {
    const prodMap = new Map<string, { name: string, gmv: number, videos: number }>();
    
    videos.forEach(v => {
      const name = v.product_name || 'Khác/Chưa rõ';
      const current = prodMap.get(name) || { name, gmv: 0, videos: 0 };
      prodMap.set(name, {
        name,
        gmv: current.gmv + (v.gmv || 0),
        videos: current.videos + 1
      });
    });

    return Array.from(prodMap.entries())
      .map(([name, stats]) => ({
        id: name,
        name: stats.name,
        value: stats.gmv,
        subtitle: `${stats.videos} video gắn link`
      } as LeaderboardEntry))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [videos]);

  const totalGMV = videos.reduce((sum, v) => sum + (v.gmv || 0), 0);
  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalOrders = videos.reduce((sum, v) => sum + (v.orders || 0), 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  const scorecards = [
    { label: 'GMV Thương hiệu', value: formatCurrency(totalGMV), change: '+2.4%', up: true },
    { label: 'Đơn hàng', value: formatNumber(totalOrders), change: '+1.1%', up: true },
    { label: 'Video đã đăng', value: totalCount.toString(), change: '+5', up: true },
    { label: 'Lượt xem', value: formatNumber(totalViews), change: '+15.7%', up: true },
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
      link.download = `brand-report-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Lỗi khi xuất báo cáo:', err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader 
        title="Thương hiệu (DECOCO Official)" 
        subtitle="Phân tích hiệu suất video kênh chính chủ"
      >
        <div className="flex items-center gap-3">
          <DateRangePicker date={date} setDate={setDate} />
          <Button size="sm" variant="outline" onClick={handleExport} className="export-ignore border-[#30363d] text-[#94a3b8] hover:text-white">
            <FileDown className="mr-2 h-4 w-4 " />
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
            <Card key={item.label} className="border-[#30363d] bg-[#161b22] hover:border-emerald-500/50 transition-all">
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
            title="TOP Sản phẩm (Brand)"
            entityType="staff"
            entries={productLeaderboard}
            valueLabel={formatCurrency}
          />
          <Card className="border-[#30363d] bg-[#161b22] overflow-hidden">
             <CardContent className="flex flex-col items-center justify-center p-12 text-center h-full gap-4">
                <ShoppingBag className="w-12 h-12 text-primary/40" />
                <div>
                  <p className="font-bold text-white">Xếp hạng Hiệu quả Content</p>
                  <p className="text-xs text-muted-foreground mt-1">Phân tích sâu về các kịch bản và format video mang lại chuyển đổi cao nhất.</p>
                </div>
             </CardContent>
          </Card>
        </div>

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Tv className="w-5 h-5 text-emerald-500" />
            Chi tiết video Thương hiệu ({totalCount})
          </h2>
          
          {loading ? (
            <div className="h-48 flex items-center justify-center border border-[#30363d] rounded-2xl bg-[#161b22]">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : paginatedVideos.length === 0 ? (
            <Card className="border-[#30363d] bg-[#161b22] border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-muted-foreground">Không tìm thấy video nào trong nguồn này.</p>
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
