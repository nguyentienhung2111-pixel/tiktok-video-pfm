-- =================================================================
-- Migration: Add video_id search to all relevant RPCs
-- Purpose: Support searching by ID Video across all pages/leaderboards
-- =================================================================

-- 1. get_videos_with_period_metrics
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
      AND (
        p_search IS NULL
        OR v.video_title  ILIKE '%' || p_search || '%'
        OR v.creator_name ILIKE '%' || p_search || '%'
        OR v.creator_id   ILIKE '%' || p_search || '%'
        OR v.video_id     ILIKE '%' || p_search || '%'
      )
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


-- 2. get_videos_summary_for_period
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
      AND (
        p_search IS NULL
        OR v.video_title  ILIKE '%' || p_search || '%'
        OR v.creator_name ILIKE '%' || p_search || '%'
        OR v.creator_id   ILIKE '%' || p_search || '%'
        OR v.video_id     ILIKE '%' || p_search || '%'
      )
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


-- 3. get_top_booking_staff_leaderboard
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
      AND (
        p_search IS NULL
        OR v.video_title  ILIKE '%' || p_search || '%'
        OR v.creator_name ILIKE '%' || p_search || '%'
        OR v.creator_id   ILIKE '%' || p_search || '%'
        OR v.video_id     ILIKE '%' || p_search || '%'
      )
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


-- 4. get_top_kocs_leaderboard
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
      AND (
        p_search IS NULL
        OR v.video_title  ILIKE '%' || p_search || '%'
        OR v.creator_name ILIKE '%' || p_search || '%'
        OR v.creator_id   ILIKE '%' || p_search || '%'
        OR v.video_id     ILIKE '%' || p_search || '%'
      )
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


-- 5. get_top_products_leaderboard
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
      AND (
        p_search IS NULL
        OR v.video_title  ILIKE '%' || p_search || '%'
        OR v.creator_name ILIKE '%' || p_search || '%'
        OR v.creator_id   ILIKE '%' || p_search || '%'
        OR v.video_id     ILIKE '%' || p_search || '%'
      )
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


-- 6. get_top_tags_by_group_leaderboard
CREATE OR REPLACE FUNCTION get_top_tags_by_group_leaderboard(
  p_period_start     DATE       DEFAULT NULL,
  p_period_end       DATE       DEFAULT NULL,
  p_source_type      TEXT       DEFAULT NULL,
  p_product_id       UUID       DEFAULT NULL,
  p_min_gmv          NUMERIC    DEFAULT NULL,
  p_min_views        BIGINT     DEFAULT NULL,
  p_search           TEXT       DEFAULT NULL,
  p_tag_ids          UUID[]     DEFAULT NULL,
  p_assigned_user_id UUID       DEFAULT NULL,
  p_groups           TEXT[]     DEFAULT ARRAY['Content Format','Hook Style','Sound'],
  p_limit_per_group  INT        DEFAULT 5
)
RETURNS TABLE (
  group_name    TEXT,
  tag_id        UUID,
  tag_name      TEXT,
  total_gmv     NUMERIC,
  video_count   BIGINT,
  rank_in_group INT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH per_video AS (
    SELECT
      v.id,
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
      AND (
        p_search IS NULL
        OR v.video_title  ILIKE '%' || p_search || '%'
        OR v.creator_name ILIKE '%' || p_search || '%'
        OR v.creator_id   ILIKE '%' || p_search || '%'
        OR v.video_id     ILIKE '%' || p_search || '%'
      )
      AND (
        p_tag_ids IS NULL
        OR array_length(p_tag_ids, 1) IS NULL
        OR EXISTS (
          SELECT 1 FROM video_tags vt
          WHERE vt.video_id = v.id AND vt.tag_id = ANY(p_tag_ids)
        )
      )
    GROUP BY v.id
  ),
  filtered AS (
    SELECT * FROM per_video
    WHERE (p_min_gmv   IS NULL OR gmv   >= p_min_gmv)
      AND (p_min_views IS NULL OR views >= p_min_views)
  ),
  tag_stats AS (
    SELECT
      g.name                              AS group_name,
      t.id                                AS tag_id,
      t.name                              AS tag_name,
      COALESCE(SUM(f.gmv), 0)::NUMERIC    AS total_gmv,
      COUNT(DISTINCT f.id)::BIGINT        AS video_count
    FROM filtered f
    JOIN video_tags vt ON vt.video_id = f.id
    JOIN tags       t  ON t.id = vt.tag_id
    JOIN tag_groups g  ON g.id = t.group_id
    WHERE
      p_groups IS NULL
      OR array_length(p_groups, 1) IS NULL
      OR g.name = ANY(p_groups)
    GROUP BY g.name, t.id, t.name
  ),
  ranked AS (
    SELECT
      ts.group_name,
      ts.tag_id,
      ts.tag_name,
      ts.total_gmv,
      ts.video_count,
      (ROW_NUMBER() OVER (
        PARTITION BY ts.group_name
        ORDER BY ts.total_gmv DESC, ts.tag_name ASC
      ))::INT AS rank_in_group
    FROM tag_stats ts
  )
  SELECT r.group_name, r.tag_id, r.tag_name, r.total_gmv, r.video_count, r.rank_in_group
  FROM ranked r
  WHERE r.rank_in_group <= COALESCE(p_limit_per_group, 5)
  ORDER BY r.group_name, r.rank_in_group;
END;
$$;
