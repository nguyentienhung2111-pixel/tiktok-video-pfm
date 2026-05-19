-- =================================================================
-- Migration: Server-side leaderboard aggregation
-- Purpose:  /team/booking used to pull up to 5000 videos and group
--           them in JS for the TOP-N leaderboards. PostgREST caps at
--           max_rows=1000 so the "All staff" view silently dropped
--           anything outside the global top 1000 by GMV — giving
--           Linh Chi BOOKING 256M / 19 KOCs instead of the real
--           260M / 110 KOCs. Aggregate inside the DB instead.
-- =================================================================

CREATE OR REPLACE FUNCTION get_top_booking_staff_leaderboard(
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
  assigned_user_id  UUID,
  display_name      TEXT,
  total_gmv         NUMERIC,
  koc_count         BIGINT,
  video_count       BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH per_video AS (
    SELECT
      v.id,
      v.creator_id,
      v.assigned_user_id,
      COALESCE(SUM(m.views), 0)::BIGINT AS views,
      COALESCE(SUM(m.gmv),   0)::NUMERIC AS gmv
    FROM videos v
    LEFT JOIN video_period_metrics m
      ON v.video_id = m.video_id
      AND (p_period_start IS NULL OR m.period_start >= p_period_start)
      AND (p_period_end   IS NULL OR m.period_end   <= p_period_end)
    WHERE
      v.assigned_user_id IS NOT NULL
      AND (p_source_type IS NULL OR v.source_type = p_source_type)
      AND (p_product_id  IS NULL OR v.product_id  = p_product_id)
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
    GROUP BY v.id, v.creator_id, v.assigned_user_id
  ),
  filtered AS (
    SELECT * FROM per_video
    WHERE (p_min_gmv   IS NULL OR gmv   >= p_min_gmv)
      AND (p_min_views IS NULL OR views >= p_min_views)
  )
  SELECT
    f.assigned_user_id,
    p.display_name,
    COALESCE(SUM(f.gmv), 0)::NUMERIC      AS total_gmv,
    COUNT(DISTINCT f.creator_id)::BIGINT  AS koc_count,
    COUNT(*)::BIGINT                      AS video_count
  FROM filtered f
  LEFT JOIN profiles p ON p.id = f.assigned_user_id
  GROUP BY f.assigned_user_id, p.display_name
  ORDER BY total_gmv DESC, f.assigned_user_id ASC
  LIMIT COALESCE(p_limit, 5);
END;
$$;


CREATE OR REPLACE FUNCTION get_top_kocs_leaderboard(
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
  creator_id    TEXT,
  creator_name  TEXT,
  total_gmv     NUMERIC,
  video_count   BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH per_video AS (
    SELECT
      v.id,
      COALESCE(v.creator_id, 'unknown') AS creator_id,
      v.creator_name,
      COALESCE(SUM(m.views), 0)::BIGINT AS views,
      COALESCE(SUM(m.gmv),   0)::NUMERIC AS gmv
    FROM videos v
    LEFT JOIN video_period_metrics m
      ON v.video_id = m.video_id
      AND (p_period_start IS NULL OR m.period_start >= p_period_start)
      AND (p_period_end   IS NULL OR m.period_end   <= p_period_end)
    WHERE
      (p_source_type IS NULL OR v.source_type = p_source_type)
      AND (p_product_id  IS NULL OR v.product_id  = p_product_id)
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
    GROUP BY v.id, v.creator_id, v.creator_name
  ),
  filtered AS (
    SELECT * FROM per_video
    WHERE (p_min_gmv   IS NULL OR gmv   >= p_min_gmv)
      AND (p_min_views IS NULL OR views >= p_min_views)
  )
  SELECT
    f.creator_id,
    (ARRAY_AGG(f.creator_name) FILTER (WHERE f.creator_name IS NOT NULL))[1] AS creator_name,
    COALESCE(SUM(f.gmv), 0)::NUMERIC AS total_gmv,
    COUNT(*)::BIGINT                 AS video_count
  FROM filtered f
  GROUP BY f.creator_id
  ORDER BY total_gmv DESC, f.creator_id ASC
  LIMIT COALESCE(p_limit, 5);
END;
$$;
