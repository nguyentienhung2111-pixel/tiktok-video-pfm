-- =================================================================
-- Migration: Deterministic ORDER BY for get_koc_mappings_summary
-- Purpose:  Client-side pagination over this RPC via .range() would
--           previously produce duplicate/missing rows when many
--           creators shared the same total_gmv (e.g., total_gmv = 0).
--           Adding `, creator_id ASC` as a tiebreaker makes the
--           ordering stable across paged requests.
-- =================================================================

CREATE OR REPLACE FUNCTION get_koc_mappings_summary()
RETURNS TABLE (
  creator_id        TEXT,
  creator_name      TEXT,
  assigned_user_id  UUID,
  video_count       BIGINT,
  total_gmv         NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH per_video AS (
    SELECT
      COALESCE(v.creator_id, 'unknown')      AS creator_id,
      v.creator_name,
      v.assigned_user_id,
      COALESCE(SUM(m.gmv), 0)::NUMERIC       AS gmv
    FROM videos v
    LEFT JOIN video_period_metrics m ON m.video_id = v.video_id
    WHERE v.source_type = 'koc'
    GROUP BY v.id, v.creator_id, v.creator_name, v.assigned_user_id
  )
  SELECT
    creator_id,
    (ARRAY_AGG(creator_name)   FILTER (WHERE creator_name IS NOT NULL))[1] AS creator_name,
    (ARRAY_AGG(assigned_user_id) FILTER (WHERE assigned_user_id IS NOT NULL))[1] AS assigned_user_id,
    COUNT(*)::BIGINT  AS video_count,
    COALESCE(SUM(gmv), 0)::NUMERIC AS total_gmv
  FROM per_video
  GROUP BY creator_id
  ORDER BY total_gmv DESC, creator_id ASC;
$$;
