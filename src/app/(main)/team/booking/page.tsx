'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, UserCheck, FileDown } from 'lucide-react';
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

export default function BookingTeamPage() {
  const { user } = useUser();
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(startOfToday(), 14),
    to: startOfToday(),
  });

  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        let query = supabase
          .from('videos')
          .select('*')
          .eq('source_type', 'koc')
          .order('published_at', { ascending: false });

        if (date?.from) query = query.gte('published_at', date.from.toISOString());
        if (date?.to) query = query.lte('published_at', date.to.toISOString());

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
    }
    fetchData();
  }, [date]);

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
          const exclusionClasses = ['DateRangePicker', 'Button', 'export-ignore'];
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
        subtitle="Theo dõi hiệu quả chiến dịch Influencer Marketing"
      >
        <div className="flex items-center gap-3">
          <DateRangePicker date={date} setDate={setDate} />
          <Button size="sm" variant="outline" onClick={handleExport} className="export-ignore">
            <FileDown className="mr-2 h-4 w-4" />
            Lưu báo cáo
          </Button>
        </div>
      </DashboardHeader>

      <div className="p-6 space-y-6" ref={dashboardRef}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {scorecards.map((item) => (
            <Card key={item.label} className="border-[#30363d] bg-[#161b22]">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-2xl font-bold">{item.value}</p>
                <div className="mt-1 flex items-center gap-1">
                  {item.up ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
                  <span className={cn("text-xs", item.up ? "text-emerald-500" : "text-red-500")}>{item.change}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Chi tiết video từ KOC</h2>
          {loading ? (
             <div className="h-64 flex items-center justify-center border border-[#30363d] rounded-2xl bg-[#161b22]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
             </div>
          ) : videos.length === 0 ? (
            <Card className="border-[#30363d] bg-[#161b22]">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Chưa có dữ liệu KOC</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">Vui lòng upload dữ liệu Seller Center chọn nguồn là 'KOC'</p>
              </CardContent>
            </Card>
          ) : (
            <VideoTable videos={videos} users={users} />
          )}
        </div>
      </div>
    </div>
  );
}
