-- =================================================================
-- Migration: Server-side product leaderboard for /team/content
-- Purpose:  The "TOP Sản phẩm (Brand)" card used to sum
--           fetchVideosWithMetrics({ limit: 5000 }) client-side, but
--           PostgREST caps responses at 1000 rows and brand has 1500+
--           videos — same truncation bug we hit on the booking page.
-- =================================================================

CREATE OR REPLACE FUNCTION get_top_products_leaderboard(
  p_period_start     DATE       DEFAULT NULL,
  p_period_end       DATE       DEFAULT NULL,
  p_source_type      TEXT       DEFAULT NULL,
  p_product_id       UUID       DEFAULT NULL,
  p_min_gmv          NUMERIC    DEFAULT NULL,
  p_min_views        BIGINT     DEFAULT NULL,
  p_search           TEXT       DEFAULT NULL,
  p_tag_ids          UUID[]     DEFAULT NULL,
  p_assigned_user_id UUID       DEFAULT NULL,
  p_limit            INT        DEFAULT 5
)
RETURNS TABLE (
  product_name TEXT,
  total_gmv    NUMERIC,
  video_count  BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH per_video AS (
    SELECT
      v.id,
      COALESCE(v.product_name, 'Khác/Chưa rõ')::TEXT AS product_name,
      COALESCE(SUM(m.views), 0)::BIGINT  AS views,
      COALESCE(SUM(m.gmv),   0)::NUMERIC AS gmv
    FROM videos v
    LEFT JOIN video_period_metrics m
      ON v.video_id = m.video_id
      AND (p_period_start IS NULL OR m.period_start >= p_period_start)
      AND (p_period_end   IS NULL OR m.period_end   <= p_period_end)
    WHERE
      (p_source_type IS NULL OR v.source_type = p_source_type)
      AND (p_product_id  IS NULL OR v.product_id = p_product_id)
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
    GROUP BY v.id, v.product_name
  ),
  filtered AS (
    SELECT * FROM per_video
    WHERE (p_min_gmv   IS NULL OR gmv   >= p_min_gmv)
      AND (p_min_views IS NULL OR views >= p_min_views)
  )
  SELECT
    f.product_name,
    COALESCE(SUM(f.gmv), 0)::NUMERIC AS total_gmv,
    COUNT(*)::BIGINT                 AS video_count
  FROM filtered f
  GROUP BY f.product_name
  ORDER BY total_gmv DESC, f.product_name ASC
  LIMIT COALESCE(p_limit, 5);
END;
$$;
