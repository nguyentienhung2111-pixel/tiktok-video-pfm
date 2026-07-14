'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScorecardValue } from '@/components/ScorecardValue';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Tv, FileDown, Loader2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { fetchVideosWithMetrics, fetchVideosSummary, VideosSummary } from '@/lib/queries';

const INITIAL_FILTERS: FilterState = {
  search: '',
  productId: '',
  tagIds: [],
  minGMV: '',
  minViews: '',
  sourceType: 'brand',
  staffId: '',
};

const EMPTY_SUMMARY: VideosSummary = {
  totalGMV: 0,
  totalViews: 0,
  totalOrders: 0,
  totalVideos: 0,
  totalCreators: 0,
  totalGMVDirect: 0,
  totalGMVIndirect: 0,
  totalClicks: 0,
  totalImpressions: 0,
};

type TagLbRow = { group_name: string; tag_id: string; tag_name: string; total_gmv: number | string; video_count: number | string; rank_in_group: number };
type TagLbEntry = { id: string; name: string; gmv: number; videoCount: number };

const TAG_GROUP_TABS: ReadonlyArray<{ key: 'Format' | 'Hook' | 'Sound'; label: string; groupName: string }> = [
  { key: 'Format', label: 'Format', groupName: 'Content Format' },
  { key: 'Hook',   label: 'Hook',   groupName: 'Hook Style'    },
  { key: 'Sound',  label: 'Sound',  groupName: 'Sound'         },
];

export default function ContentTeamPage() {
  const { user } = useUser();
  const [summary, setSummary] = useState<VideosSummary>(EMPTY_SUMMARY);
  const [productLeaderboard, setProductLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [paginatedVideos, setPaginatedVideos] = useState<VideoWithMetrics[]>([]);
  const [tagLeaderboard, setTagLeaderboard] = useState<Record<string, TagLbEntry[]>>({});
  const [activeTagTab, setActiveTagTab] = useState<'Format' | 'Hook' | 'Sound'>('Format');
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
        tagIds: filters.tagIds,
      };

      const rpcFilters = {
        p_period_start: periodStart ?? null,
        p_period_end: periodEnd ?? null,
        p_source_type: 'brand',
        p_product_id: filters.productId || null,
        p_min_gmv: filters.minGMV ? parseInt(filters.minGMV) : null,
        p_min_views: filters.minViews ? parseInt(filters.minViews) : null,
        p_search: filters.search || null,
        p_tag_ids: filters.tagIds && filters.tagIds.length > 0 ? filters.tagIds : null,
      };

      const [summaryResult, tableResult, usersResult, tagLbResult, productLbResult] = await Promise.all([
        fetchVideosSummary(baseParams),
        fetchVideosWithMetrics({
          ...baseParams,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }),
        supabase.from('profiles').select('*').eq('is_active', true),
        supabase.rpc('get_top_tags_by_group_leaderboard', {
          ...rpcFilters,
          p_groups: TAG_GROUP_TABS.map(t => t.groupName),
          p_limit_per_group: 5,
        }),
        supabase.rpc('get_top_products_leaderboard', { ...rpcFilters, p_limit: 5 }),
      ]);

      setSummary(summaryResult);
      setPaginatedVideos(tableResult.data);
      setTotalCount(tableResult.totalCount);

      if (usersResult.error) throw usersResult.error;
      setUsers((usersResult.data as Profile[]) || []);

      if (tagLbResult.error) throw tagLbResult.error;
      const grouped: Record<string, TagLbEntry[]> = {};
      for (const row of (tagLbResult.data ?? []) as TagLbRow[]) {
        const list = grouped[row.group_name] ?? (grouped[row.group_name] = []);
        list.push({
          id: row.tag_id,
          name: row.tag_name,
          gmv: Number(row.total_gmv) || 0,
          videoCount: Number(row.video_count) || 0,
        });
      }
      setTagLeaderboard(grouped);

      if (productLbResult.error) throw productLbResult.error;
      setProductLeaderboard(
        ((productLbResult.data ?? []) as Array<{ product_name: string; total_gmv: number | string; video_count: number | string }>).map(r => ({
          id: r.product_name,
          name: r.product_name,
          value: Number(r.total_gmv) || 0,
          subtitle: `${Number(r.video_count) || 0} video gắn link`,
        }))
      );
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu Thương hiệu:', error);
    } finally {
      setLoading(false);
    }
  }, [date, filters, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  const ctr = summary.totalImpressions > 0 ? (summary.totalClicks / summary.totalImpressions) * 100 : 0;
  const cr = summary.totalClicks > 0 ? (summary.totalOrders / summary.totalClicks) * 100 : 0;

  const scorecards = [
    { label: 'GMV Tổng', value: formatCurrency(summary.totalGMV) },
    { label: 'GMV trực tiếp', value: formatCurrency(summary.totalGMVDirect) },
    { label: 'Click', value: formatNumber(summary.totalClicks) },
    { label: 'CTR (%)', value: `${ctr.toFixed(2)}%` },
    { label: 'Đơn hàng', value: formatNumber(summary.totalOrders) },
    { label: 'CR (%)', value: `${cr.toFixed(2)}%` },
    { label: 'Video đã đăng', value: formatNumber(summary.totalVideos) },
    { label: 'Lượt hiển thị', value: formatNumber(summary.totalImpressions) },
    { label: 'Lượt xem', value: formatNumber(summary.totalViews) },
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

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {scorecards.map((item) => (
            <Card key={item.label} className="border-[#30363d] bg-[#161b22] hover:border-emerald-500/50 transition-all">
              <CardContent className="p-3 sm:p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">{item.label}</p>
                <ScorecardValue value={item.value} numberClassName="text-lg sm:text-xl xl:text-2xl" />
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
          <Card className="border-[#30363d] bg-[#161b22] overflow-hidden flex flex-col">
            <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-[#30363d] bg-[#0d1117]/50">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-[#94a3b8] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Xếp hạng Hiệu quả Content
              </CardTitle>
              <div className="flex items-center gap-1 export-ignore">
                {TAG_GROUP_TABS.map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTagTab(tab.key)}
                    className={cn(
                      "px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-colors",
                      activeTagTab === tab.key
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "text-muted-foreground hover:text-white hover:bg-white/[0.04] border border-transparent"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1">
              {(() => {
                const groupName = TAG_GROUP_TABS.find(t => t.key === activeTagTab)?.groupName ?? '';
                const entries = tagLeaderboard[groupName] ?? [];
                const max = entries.length > 0 ? entries[0].gmv : 0;
                if (entries.length === 0) {
                  return (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      Chưa có dữ liệu cho nhóm "{groupName}".
                    </div>
                  );
                }
                return (
                  <ol className="space-y-3">
                    {entries.map((e, idx) => {
                      const pct = max > 0 ? Math.max(2, Math.round((e.gmv / max) * 100)) : 0;
                      return (
                        <li key={e.id} className="space-y-1.5">
                          <div className="flex items-baseline justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{idx + 1}</span>
                              <span className="font-bold text-white truncate">{e.name}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-bold text-emerald-400">{formatCurrency(e.gmv)}</div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{e.videoCount} video clip</div>
                            </div>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[#0d1117] overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500/70 to-emerald-400"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                );
              })()}
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
