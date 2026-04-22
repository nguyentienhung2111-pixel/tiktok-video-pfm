'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Tv, FileDown, Loader2, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { VideoWithMetrics, Profile } from '@/types';
import { VideoTable } from '@/components/VideoTable';
import { useUser } from '@/components/user-context';
import DashboardHeader from '@/components/DashboardHeader';
import { DateRangePicker } from '@/components/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays, startOfToday, format } from 'date-fns';
import { toPng } from 'html-to-image';
import FilterBar, { FilterState } from '@/components/FilterBar';
import { Leaderboard, LeaderboardEntry } from '@/components/Leaderboard';
import { fetchVideosWithMetrics } from '@/lib/queries';

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
  const [summaryVideos, setSummaryVideos] = useState<VideoWithMetrics[]>([]);
  const [paginatedVideos, setPaginatedVideos] = useState<VideoWithMetrics[]>([]);
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

  const dashboardRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const periodStart = date?.from ? format(date.from, 'yyyy-MM-dd') : undefined;
      const periodEnd = date?.to ? format(date.to, 'yyyy-MM-dd') : undefined;

      const baseParams = {
        periodStart,
        periodEnd,
        sourceType: 'brand',
        productId: filters.productId,
        minGMV: filters.minGMV,
        minViews: filters.minViews,
        search: filters.search,
      };

      // Summary
      const summaryResult = await fetchVideosWithMetrics({ ...baseParams, limit: 5000, offset: 0 });
      setSummaryVideos(summaryResult.data);

      // Table
      const tableResult = await fetchVideosWithMetrics({
        ...baseParams,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setPaginatedVideos(tableResult.data);
      setTotalCount(tableResult.totalCount);

      // Users
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

  const productLeaderboard = useMemo(() => {
    const prodMap = new Map<string, { name: string; gmv: number; videos: number }>();

    summaryVideos.forEach(v => {
      const name = v.product_name || 'Khác/Chưa rõ';
      const current = prodMap.get(name) || { name, gmv: 0, videos: 0 };
      prodMap.set(name, {
        name,
        gmv: current.gmv + (v.gmv || 0),
        videos: current.videos + 1,
      });
    });

    return Array.from(prodMap.entries())
      .map(([name, stats]) => ({
        id: name,
        name: stats.name,
        value: stats.gmv,
        subtitle: `${stats.videos} video gắn link`,
      } as LeaderboardEntry))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [summaryVideos]);

  const totalGMV = summaryVideos.reduce((sum, v) => sum + (v.gmv || 0), 0);
  const totalViews = summaryVideos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalOrders = summaryVideos.reduce((sum, v) => sum + (v.orders || 0), 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  const scorecards = [
    { label: 'GMV Thương hiệu', value: formatCurrency(totalGMV), change: '', up: true },
    { label: 'Đơn hàng', value: formatNumber(totalOrders), change: '', up: true },
    { label: 'Video đã đăng', value: totalCount.toString(), change: '', up: true },
    { label: 'Lượt xem', value: formatNumber(totalViews), change: '', up: true },
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
            <FileDown className="mr-2 h-4 w-4" />
            Lưu báo cáo
          </Button>
        </div>
      </DashboardHeader>

      <div className="p-6 space-y-8" ref={dashboardRef}>
        <div className="export-ignore">
          <FilterBar filters={filters} setFilters={setFilters} onClear={() => setFilters(INITIAL_FILTERS)} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {scorecards.map((item) => (
            <Card key={item.label} className="border-[#30363d] bg-[#161b22] hover:border-emerald-500/50 transition-all">
              <CardContent className="p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">{item.label}</p>
                <p className="mt-2 text-3xl font-black text-white">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Leaderboards */}
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

        {/* Video Table */}
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
            <>
              <VideoTable videos={paginatedVideos} users={users} onRefresh={fetchData} />

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 px-2 border-t border-[#30363d] export-ignore">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} của {totalCount} video
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="bg-[#161b22] border border-[#30363d] text-xs font-bold py-1.5 px-3 rounded-lg focus:outline-none appearance-none pr-8 cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <option value={10}>10/Trang</option>
                    <option value={20}>20/Trang</option>
                    <option value={50}>50/Trang</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8 border-[#30363d] bg-transparent hover:bg-primary/10 disabled:opacity-30"
                      onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-bold text-foreground px-2">
                      Trang {page} / {Math.max(1, Math.ceil(totalCount / pageSize))}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8 border-[#30363d] bg-transparent hover:bg-primary/10 disabled:opacity-30"
                      onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(totalCount / pageSize)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
