'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Tv, Upload, FileDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Video, Profile } from '@/types';
import { VideoTable } from '@/components/VideoTable';
import DashboardHeader from '@/components/DashboardHeader';
import { DateRangePicker } from '@/components/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays, startOfToday } from 'date-fns';
import { toPng } from 'html-to-image';
import FilterBar, { FilterState } from '@/components/FilterBar';

const INITIAL_FILTERS: FilterState = {
  search: '',
  productId: '',
  tagIds: [],
  minGMV: '',
  minViews: '',
  sourceType: 'all',
};

export default function DashboardPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(startOfToday(), 7),
    to: startOfToday(),
  });

  const dashboardRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('videos')
        .select('*')
        .order('published_at', { ascending: false });

      // Apply Date Filter (Using YYYY-MM-DD format for DATE column)
      if (date?.from) {
        const fromDate = new Date(date.from);
        // Ensure we handle local date correctly for the query
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

      // Apply Source Filter
      if (filters.sourceType !== 'all') {
        query = query.eq('source_type', filters.sourceType);
      }

      // Apply Product Filter
      if (filters.productId) {
        query = query.eq('product_id', filters.productId);
      }

      // Apply Metrics Filter
      if (filters.minGMV) {
        query = query.gte('gmv', parseInt(filters.minGMV));
      }
      if (filters.minViews) {
        query = query.gte('views', parseInt(filters.minViews));
      }

      // Apply Search Filter (Title or Creator)
      if (filters.search) {
        query = query.or(`video_title.ilike.%${filters.search}%,creator_name.ilike.%${filters.search}%`);
      }

      // Apply Tags Filter
      if (filters.tagIds.length > 0) {
        // Fetch tag names first as we store names in the tags array on the videos table
        const { data: tagData } = await supabase
          .from('tags')
          .select('name')
          .in('id', filters.tagIds);
        
        const tagNames = tagData?.map(t => t.name) || [];
        if (tagNames.length > 0) {
          query = query.overlaps('tags', tagNames);
        }
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
      console.error('Lỗi khi tải dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  }, [date, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalGMV = videos.reduce((sum, v) => sum + (v.gmv || 0), 0);
  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalOrders = videos.reduce((sum, v) => sum + (v.orders || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  const scorecards = [
    { label: 'Tổng GMV', value: formatCurrency(totalGMV), change: '', up: true },
    { label: 'Tổng đơn hàng', value: formatNumber(totalOrders), change: '', up: true },
    { label: 'Tổng Video', value: videos.length.toString(), change: '', up: true },
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
            <FileDown className="mr-2 h-4 w-4 " />
            Lưu báo cáo (Ảnh)
          </Button>
        </div>
      </DashboardHeader>

      <div className="p-6 space-y-8" ref={dashboardRef}>
        {/* Filter Section */}
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
                    <span className={cn("text-xs font-bold", item.up ? "text-emerald-500" : "text-red-500")}>
                      {item.change}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Video Table Area */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black flex items-center gap-2">
              <Tv className="w-5 h-5 text-primary" />
              Chi tiết video ({videos.length})
            </h2>
          </div>
          
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center border border-[#30363d] rounded-2xl bg-[#161b22] gap-4">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
              <p className="text-sm text-[#94a3b8] font-medium">Đang lọc dữ liệu...</p>
            </div>
          ) : videos.length === 0 ? (
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
            <VideoTable videos={videos} users={users} onRefresh={fetchData} />
          )}
        </div>
      </div>
    </div>
  );
}
