-- =================================================================
-- Migration: Create get_videos_timeseries_for_period RPC
-- Purpose: Aggregate video metrics grouped by reporting period
--          (period_start, period_end) so the dashboards can render a
--          time-series / week-over-week trend chart instead of only a
--          single cumulative total.
--
-- Accepts the same filter parameters as get_videos_summary_for_period
-- (date range, source type, product, min GMV/views, search, tags,
-- assigned user) and applies the min_gmv / min_views thresholds at the
-- per-video level over the selected range, identical to the summary RPC,
-- before breaking the qualifying videos' metrics down by period.
-- =================================================================

DROP FUNCTION IF EXISTS get_videos_timeseries_for_period(date,date,text,uuid,numeric,bigint,text,uuid[],uuid);
CREATE OR REPLACE FUNCTION get_videos_timeseries_for_period(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL,
  p_source_type TEXT DEFAULT NULL,
  p_product_id UUID DEFAULT NULL,
  p_min_gmv NUMERIC DEFAULT NULL,
  p_min_views BIGINT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_tag_ids UUID[] DEFAULT NULL,
  p_assigned_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  period_start DATE,
  period_end DATE,
  total_gmv NUMERIC,
  total_gmv_direct NUMERIC,
  total_gmv_indirect NUMERIC,
  total_orders BIGINT,
  total_views BIGINT,
  total_videos BIGINT
) AS $$
BEGIN
  RETURN QUERY
  -- Determine which videos qualify given all non-period filters plus the
  -- per-video min GMV/views thresholds computed over the selected range.
  WITH eligible AS (
    SELECT v.video_id
    FROM videos v
    LEFT JOIN video_period_metrics m
      ON v.video_id = m.video_id
      AND (p_period_start IS NULL OR m.period_start >= p_period_start)
      AND (p_period_end   IS NULL OR m.period_end   <= p_period_end)
    WHERE
      (p_source_type IS NULL OR v.source_type = p_source_type)
      AND (p_product_id IS NULL OR v.product_id = p_product_id)
      AND (p_assigned_user_id IS NULL OR v.assigned_user_id = p_assigned_user_id)
      AND (p_search IS NULL OR v.video_title ILIKE '%' || p_search || '%')
      AND (
        p_tag_ids IS NULL
        OR array_length(p_tag_ids, 1) IS NULL
        OR EXISTS (
          SELECT 1 FROM video_tags vt
          WHERE vt.video_id = v.id AND vt.tag_id = ANY(p_tag_ids)
        )
      )
    GROUP BY v.video_id
    HAVING (p_min_gmv   IS NULL OR COALESCE(SUM(m.gmv), 0)   >= p_min_gmv)
       AND (p_min_views IS NULL OR COALESCE(SUM(m.views), 0) >= p_min_views)
  )
  SELECT
    m.period_start,
    m.period_end,
    COALESCE(SUM(m.gmv), 0)::NUMERIC          AS total_gmv,
    COALESCE(SUM(m.gmv_direct), 0)::NUMERIC   AS total_gmv_direct,
    COALESCE(SUM(m.gmv_indirect), 0)::NUMERIC AS total_gmv_indirect,
    COALESCE(SUM(m.orders), 0)::BIGINT        AS total_orders,
    COALESCE(SUM(m.views), 0)::BIGINT         AS total_views,
    COUNT(DISTINCT m.video_id)::BIGINT        AS total_videos
  FROM video_period_metrics m
  JOIN eligible e ON e.video_id = m.video_id
  WHERE (p_period_start IS NULL OR m.period_start >= p_period_start)
    AND (p_period_end   IS NULL OR m.period_end   <= p_period_end)
  GROUP BY m.period_start, m.period_end
  ORDER BY m.period_start ASC;
END;
$$ LANGUAGE plpgsql;
