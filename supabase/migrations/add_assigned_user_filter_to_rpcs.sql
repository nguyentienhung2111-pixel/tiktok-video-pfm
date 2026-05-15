-- =================================================================
-- Migration: Add assigned_user filtering to video RPCs
-- Purpose: Support filtering by videos.assigned_user_id in both
--          get_videos_with_period_metrics and
--          get_videos_summary_for_period.
-- =================================================================

CREATE OR REPLACE FUNCTION get_videos_with_period_metrics(
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL,
  p_source_type TEXT DEFAULT NULL,
  p_product_id UUID DEFAULT NULL,
  p_min_gmv NUMERIC DEFAULT NULL,
  p_min_views BIGINT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_order_by TEXT DEFAULT 'gmv',
  p_order_asc BOOLEAN DEFAULT FALSE,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_tag_ids UUID[] DEFAULT NULL,
  p_assigned_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  video_id TEXT,
  source_type TEXT,
  creator_name TEXT,
  creator_id TEXT,
  video_title TEXT,
  published_at DATE,
  product_name TEXT,
  product_id UUID,
  diagnosis TEXT,
  assigned_user_id UUID,
  tags TEXT[],
  raw_data JSONB,
  uploaded_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  views BIGINT,
  likes BIGINT,
  comments BIGINT,
  shares BIGINT,
  orders BIGINT,
  gmv NUMERIC,
  new_followers BIGINT,
  impressions BIGINT,
  reach BIGINT,
  engagement NUMERIC,
  click_to_order_rate NUMERIC,
  video_duration_sec INT,
  conversion_rate NUMERIC,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT
      v.id,
      v.video_id,
      v.source_type,
      v.creator_name,
      v.creator_id,
      v.video_title,
      v.published_at,
      v.product_name,
      v.product_id,
      v.diagnosis,
      v.assigned_user_id,
      v.tags,
      v.raw_data,
      v.uploaded_by,
      v.created_at,
      v.updated_at,
      COALESCE(SUM(m.views), 0)::BIGINT AS views,
      COALESCE(SUM(m.likes), 0)::BIGINT AS likes,
      COALESCE(SUM(m.comments), 0)::BIGINT AS comments,
      COALESCE(SUM(m.shares), 0)::BIGINT AS shares,
      COALESCE(SUM(m.orders), 0)::BIGINT AS orders,
      COALESCE(SUM(m.gmv), 0)::NUMERIC AS gmv,
      COALESCE(SUM(m.new_followers), 0)::BIGINT AS new_followers,
      COALESCE(SUM(m.impressions), 0)::BIGINT AS impressions,
      COALESCE(SUM(m.reach), 0)::BIGINT AS reach,
      COALESCE(SUM(m.engagement), 0)::NUMERIC AS engagement,
      COALESCE(AVG(m.click_to_order_rate), 0)::NUMERIC AS click_to_order_rate,
      0::INT AS video_duration_sec,
      0::NUMERIC AS conversion_rate
    FROM videos v
    LEFT JOIN video_period_metrics m
      ON v.video_id = m.video_id
      AND (p_period_start IS NULL OR m.period_start >= p_period_start)
      AND (p_period_end IS NULL OR m.period_end <= p_period_end)
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
    GROUP BY v.id, v.video_id, v.source_type, v.creator_name, v.creator_id,
             v.video_title, v.published_at, v.product_name, v.product_id,
             v.diagnosis, v.assigned_user_id, v.tags, v.raw_data,
             v.uploaded_by, v.created_at, v.updated_at
  ),
  total AS (
    SELECT COUNT(*) AS cnt FROM filtered
    WHERE (p_min_gmv IS NULL OR filtered.gmv >= p_min_gmv)
      AND (p_min_views IS NULL OR filtered.views >= p_min_views)
  )
  SELECT
    f.id, f.video_id, f.source_type, f.creator_name, f.creator_id,
    f.video_title, f.published_at, f.product_name, f.product_id,
    f.diagnosis, f.assigned_user_id, f.tags, f.raw_data,
    f.uploaded_by, f.created_at, f.updated_at,
    f.views, f.likes, f.comments, f.shares, f.orders, f.gmv,
    f.new_followers, f.impressions, f.reach, f.engagement,
    f.click_to_order_rate, f.video_duration_sec, f.conversion_rate,
    t.cnt AS total_count
  FROM filtered f, total t
  WHERE (p_min_gmv IS NULL OR f.gmv >= p_min_gmv)
    AND (p_min_views IS NULL OR f.views >= p_min_views)
  ORDER BY
    CASE WHEN p_order_by = 'gmv' AND NOT p_order_asc THEN f.gmv END DESC NULLS LAST,
    CASE WHEN p_order_by = 'gmv' AND p_order_asc THEN f.gmv END ASC NULLS LAST,
    CASE WHEN p_order_by = 'views' AND NOT p_order_asc THEN f.views END DESC NULLS LAST,
    CASE WHEN p_order_by = 'views' AND p_order_asc THEN f.views END ASC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_videos_summary_for_period(
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
