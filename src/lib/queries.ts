import { supabase } from '@/lib/supabase';
import { VideoWithMetrics } from '@/types';

export interface FetchVideosParams {
  periodStart?: string;
  periodEnd?: string;
  sourceType?: string;
  productId?: string;
  minGMV?: string;
  minViews?: string;
  search?: string;
  tagIds?: string[];
  orderBy?: string;
  orderAsc?: boolean;
  limit?: number;
  offset?: number;
}

export interface FetchVideosResult {
  data: VideoWithMetrics[];
  totalCount: number;
}

export interface VideosSummary {
  totalGMV: number;
  totalViews: number;
  totalOrders: number;
  totalVideos: number;
  totalCreators: number;
}

export type FetchVideosSummaryParams = Omit<
  FetchVideosParams,
  'orderBy' | 'orderAsc' | 'limit' | 'offset'
>;

/**
 * Fetch videos with aggregated metrics from video_period_metrics,
 * filtered by report period and other criteria.
 * Uses the get_videos_with_period_metrics RPC function.
 */
export async function fetchVideosWithMetrics(params: FetchVideosParams): Promise<FetchVideosResult> {
  const {
    periodStart,
    periodEnd,
    sourceType,
    productId,
    minGMV,
    minViews,
    search,
    tagIds,
    orderBy = 'gmv',
    orderAsc = false,
    limit = 50,
    offset = 0,
  } = params;

  const rpcParams: Record<string, unknown> = {
    p_order_by: orderBy,
    p_order_asc: orderAsc,
    p_limit: limit,
    p_offset: offset,
  };

  if (periodStart) rpcParams.p_period_start = periodStart;
  if (periodEnd) rpcParams.p_period_end = periodEnd;
  if (sourceType && sourceType !== 'all') rpcParams.p_source_type = sourceType;
  if (productId) rpcParams.p_product_id = productId;
  if (minGMV) rpcParams.p_min_gmv = parseInt(minGMV);
  if (minViews) rpcParams.p_min_views = parseInt(minViews);
  if (search) rpcParams.p_search = search;
  if (tagIds && tagIds.length > 0) rpcParams.p_tag_ids = tagIds;

  const { data, error } = await supabase.rpc('get_videos_with_period_metrics', rpcParams);

  if (error) throw error;

  const rows = (data || []) as VideoWithMetrics[];
  const totalCount = rows.length > 0 ? (rows[0].total_count || rows.length) : 0;

  return { data: rows, totalCount };
}

/**
 * Fetch aggregate scorecard totals entirely server-side.
 * Use this for "Tổng GMV / Lượt xem / Đơn hàng / Video / KOC" cards
 * instead of summing a paginated/limited row payload on the client.
 */
export async function fetchVideosSummary(
  params: FetchVideosSummaryParams
): Promise<VideosSummary> {
  const {
    periodStart,
    periodEnd,
    sourceType,
    productId,
    minGMV,
    minViews,
    search,
    tagIds,
  } = params;

  const rpcParams: Record<string, unknown> = {};
  if (periodStart) rpcParams.p_period_start = periodStart;
  if (periodEnd) rpcParams.p_period_end = periodEnd;
  if (sourceType && sourceType !== 'all') rpcParams.p_source_type = sourceType;
  if (productId) rpcParams.p_product_id = productId;
  if (minGMV) rpcParams.p_min_gmv = parseInt(minGMV);
  if (minViews) rpcParams.p_min_views = parseInt(minViews);
  if (search) rpcParams.p_search = search;
  if (tagIds && tagIds.length > 0) rpcParams.p_tag_ids = tagIds;

  const { data, error } = await supabase.rpc(
    'get_videos_summary_for_period',
    rpcParams
  );

  if (error) throw error;

  const row = (data || [])[0] as
    | {
        total_gmv: number | string | null;
        total_views: number | string | null;
        total_orders: number | string | null;
        total_videos: number | string | null;
        total_creators: number | string | null;
      }
    | undefined;

  return {
    totalGMV: Number(row?.total_gmv ?? 0),
    totalViews: Number(row?.total_views ?? 0),
    totalOrders: Number(row?.total_orders ?? 0),
    totalVideos: Number(row?.total_videos ?? 0),
    totalCreators: Number(row?.total_creators ?? 0),
  };
}
