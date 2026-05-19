-- =================================================================
-- Migration: Server-side pagination + search for KOC mappings
-- Purpose:  Rendering 2700+ rows in one table caused UI lag and
--           PostgREST max_rows=1000 forced an awkward client-side
--           batching loop. Move LIMIT/OFFSET/search into the RPC so
--           each request returns just one page + a total_count.
--           Matches the pattern used by get_videos_with_period_metrics.
-- =================================================================

-- Drop all previous signatures to avoid PGRST203 ambiguity.
DROP FUNCTION IF EXISTS get_koc_mappings_summary();
DROP FUNCTION IF EXISTS get_koc_mappings_summary(INT, INT, TEXT);

CREATE OR REPLACE FUNCTION get_koc_mappings_summary(
  p_limit  INT  DEFAULT NULL,
  p_offset INT  DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  creator_id        TEXT,
  creator_name      TEXT,
  assigned_user_id  UUID,
  video_count       BIGINT,
  total_gmv         NUMERIC,
  total_count       BIGINT
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
  ),
  per_creator AS (
    SELECT
      creator_id,
      (ARRAY_AGG(creator_name)   FILTER (WHERE creator_name IS NOT NULL))[1] AS creator_name,
      (ARRAY_AGG(assigned_user_id) FILTER (WHERE assigned_user_id IS NOT NULL))[1] AS assigned_user_id,
      COUNT(*)::BIGINT  AS video_count,
      COALESCE(SUM(gmv), 0)::NUMERIC AS total_gmv
    FROM per_video
    GROUP BY creator_id
  ),
  filtered AS (
    SELECT *
    FROM per_creator
    WHERE
      p_search IS NULL
      OR p_search = ''
      OR creator_name ILIKE '%' || p_search || '%'
      OR creator_id   ILIKE '%' || p_search || '%'
  ),
  counted AS (
    SELECT *, COUNT(*) OVER ()::BIGINT AS total_count
    FROM filtered
  )
  SELECT
    creator_id,
    creator_name,
    assigned_user_id,
    video_count,
    total_gmv,
    total_count
  FROM counted
  ORDER BY total_gmv DESC, creator_id ASC
  LIMIT  COALESCE(p_limit, 2147483647)
  OFFSET COALESCE(p_offset, 0);
$$;
