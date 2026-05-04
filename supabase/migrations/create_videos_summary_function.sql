-- =================================================================
-- Migration: Create get_videos_summary_for_period RPC
-- Purpose: Aggregate scorecard totals (GMV, views, orders, video
--          count, distinct creators) entirely on the database side
--          so the client no longer has to SUM a 5000-row truncated
--          payload.
-- =================================================================

CREATE OR REPLACE FUNCTION get_videos_summary_for_period(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL,
  p_source_type TEXT DEFAULT NULL,
  p_product_id UUID DEFAULT NULL,
  p_min_gmv NUMERIC DEFAULT NULL,
  p_min_views BIGINT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_gmv NUMERIC,
  total_views BIGINT,
  total_orders BIGINT,
  total_videos BIGINT,
  total_creators BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH per_video AS (
    SELECT
      v.id,
      v.creator_id,
      COALESCE(SUM(m.views), 0)::BIGINT  AS views,
      COALESCE(SUM(m.orders), 0)::BIGINT AS orders,
      COALESCE(SUM(m.gmv), 0)::NUMERIC   AS gmv
    FROM videos v
    LEFT JOIN video_period_metrics m
      ON v.video_id = m.video_id
      AND (p_period_start IS NULL OR m.period_start >= p_period_start)
      AND (p_period_end   IS NULL OR m.period_end   <= p_period_end)
    WHERE
      (p_source_type IS NULL OR v.source_type = p_source_type)
      AND (p_product_id IS NULL OR v.product_id = p_product_id)
      AND (p_search IS NULL OR v.video_title ILIKE '%' || p_search || '%')
    GROUP BY v.id, v.creator_id
  )
  SELECT
    COALESCE(SUM(gmv), 0)::NUMERIC      AS total_gmv,
    COALESCE(SUM(views), 0)::BIGINT     AS total_views,
    COALESCE(SUM(orders), 0)::BIGINT    AS total_orders,
    COUNT(*)::BIGINT                    AS total_videos,
    COUNT(DISTINCT creator_id)::BIGINT  AS total_creators
  FROM per_video
  WHERE (p_min_gmv   IS NULL OR gmv   >= p_min_gmv)
    AND (p_min_views IS NULL OR views >= p_min_views);
END;
$$ LANGUAGE plpgsql;
