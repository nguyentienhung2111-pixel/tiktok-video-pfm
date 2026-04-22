'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, Tv, FileDown, Loader2,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { VideoWithMetrics, Profile } from '@/types';
import { VideoTable } from '@/components/VideoTable';
import DashboardHeader from '@/components/DashboardHeader';
import { DateRangePicker } from '@/components/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays, startOfToday, format } from 'date-fns';
import { toPng } from 'html-to-image';
import FilterBar, { FilterState } from '@/components/FilterBar';
import { fetchVideosWithMetrics } from '@/lib/queries';

const INITIAL_FILTERS: FilterState = {
  search: '',
  productId: '',
  tagIds: [],
  minGMV: '',
  minViews: '',
  sourceType: 'all',
};

export default function DashboardPage() {
  const [summaryVideos, setSummaryVideos] = useState<VideoWithMetrics[]>([]);
  const [paginatedVideos, setPaginatedVideos] = useState<VideoWithMetrics[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
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
        sourceType: filters.sourceType,
        productId: filters.productId,
        minGMV: filters.minGMV,
        minViews: filters.minViews,
        search: filters.search,
      };

      // 1. Fetch summary data (for scorecards)
      const summaryResult = await fetchVideosWithMetrics({
        ...baseParams,
        limit: 5000,
        offset: 0,
      });
      setSummaryVideos(summaryResult.data);

      // 2. Fetch paginated data (for table)
      const tableResult = await fetchVideosWithMetrics({
        ...baseParams,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setPaginatedVideos(tableResult.data);
      setTotalCount(tableResult.totalCount);

      // 3. Fetch users
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true);
      if (userError) throw userError;
      setUsers((userData as Profile[]) || []);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  }, [date, filters, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalGMV = summaryVideos.reduce((sum, v) => sum + (v.gmv || 0), 0);
  const totalViews = summaryVideos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalOrders = summaryVideos.reduce((sum, v) => sum + (v.orders || 0), 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const formatNumber = (val: number) =>
    new Intl.NumberFormat('vi-VN').format(val);

  const scorecards = [
    { label: 'Tổng GMV', value: formatCurrency(totalGMV), change: '', up: true },
    { label: 'Tổng đơn hàng', value: formatNumber(totalOrders), change: '', up: true },
    { label: 'Tổng Video', value: totalCount.toString(), change: '', up: true },
    { label: 'Tổng lượt xem', value: formatNumber(totalViews), change: '', up: true },
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
      link.download = `report-dashboard-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Lỗi khi xuất báo cáo:', err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Dashboard Tổng quan"
        subtitle="Hiệu suất video TikTok DECOCO"
      >
        <div className="flex items-center gap-3">
          <DateRangePicker date={date} setDate={setDate} />
          <Button size="sm" className="bg-primary text-primary-foreground export-ignore shadow-lg shadow-primary/20" onClick={handleExport}>
            <FileDown className="mr-2 h-4 w-4" />
            Lưu báo cáo (Ảnh)
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

        {/* Scorecards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {scorecards.map((item, i) => (
            <Card key={item.label} className={cn(
              "border-[#30363d] bg-[#161b22] relative overflow-hidden transition-all hover:scale-[1.02] hover:border-primary/50",
              i === 0 && "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/5 before:to-transparent"
            )}>
              <CardContent className="p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">{item.label}</p>
                <p className="mt-2 text-3xl font-black text-white">{item.value}</p>
                {item.change && (
                  <div className="mt-2 flex items-center gap-1">
                    {item.up ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
                    <span className={cn("text-xs font-bold", item.up ? "text-emerald-500" : "text-red-500")}>{item.change}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Video Table */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black flex items-center gap-2 text-foreground">
              <Tv className="w-5 h-5 text-primary" />
              Chi tiết video ({totalCount})
            </h2>
          </div>

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center border border-[#30363d] rounded-2xl bg-[#161b22] gap-4">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
              <p className="text-sm text-[#94a3b8] font-medium">Đang lọc dữ liệu...</p>
            </div>
          ) : paginatedVideos.length === 0 ? (
            <Card className="border-[#30363d] bg-[#161b22] border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Tv className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-bold text-foreground">Không tìm thấy video nào</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                  Thử điều chỉnh bộ lọc hoặc thời gian để tìm thấy dữ liệu mong muốn.
                </p>
                <Button variant="outline" className="mt-6 border-[#30363d]" onClick={() => setFilters(INITIAL_FILTERS)}>
                  Xóa tất cả bộ lọc
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <VideoTable videos={paginatedVideos} users={users} onRefresh={fetchData} />

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 px-2 border-t border-[#30363d] export-ignore">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Hiển thị {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} trong {totalCount} video
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="bg-[#161b22] border border-[#30363d] text-xs font-bold py-1.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8 cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <option value={10}>10/Trang</option>
                    <option value={20}>20/Trang</option>
                    <option value={50}>50/Trang</option>
                    <option value={100}>100/Trang</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="icon"
                      className="h-8 w-8 border-[#30363d] bg-transparent hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <span className="text-xs font-bold text-foreground px-2">
                      Trang {page} / {Math.max(1, Math.ceil(totalCount / pageSize))}
                    </span>

                    <Button
                      variant="outline" size="icon"
                      className="h-8 w-8 border-[#30363d] bg-transparent hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= Math.ceil(totalCount / pageSize)}
                    >
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
