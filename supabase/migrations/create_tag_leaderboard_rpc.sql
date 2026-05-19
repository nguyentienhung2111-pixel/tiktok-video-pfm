-- =================================================================
-- Migration: Server-side tag leaderboard for /team/content
-- Purpose:  The Card "Xếp hạng Hiệu quả Content" needs Top-N tags
--           per tag-group (Content Format / Hook Style / Sound).
--           Brand source already has 1500+ videos so aggregating
--           client-side against the limit:5000 fetch would silently
--           truncate at PostgREST's 1000-row cap (same bug pattern
--           as the booking leaderboard fix).
-- =================================================================

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
      AND (p_search IS NULL OR v.video_title ILIKE '%' || p_search || '%')
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
