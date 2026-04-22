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
  orderBy?: string;
  orderAsc?: boolean;
  limit?: number;
  offset?: number;
}

export interface FetchVideosResult {
  data: VideoWithMetrics[];
  totalCount: number;
}

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

  const { data, error } = await supabase.rpc('get_videos_with_period_metrics', rpcParams);

  if (error) throw error;

  const rows = (data || []) as VideoWithMetrics[];
  const totalCount = rows.length > 0 ? (rows[0].total_count || rows.length) : 0;

  return { data: rows, totalCount };
}
