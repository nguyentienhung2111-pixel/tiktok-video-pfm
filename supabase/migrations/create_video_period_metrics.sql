-- =================================================================
-- Migration: Create video_period_metrics table
-- Purpose: Store numeric metrics per reporting period instead of
--          directly on the videos table. This allows accurate
--          date-range filtering by report period.
-- =================================================================

-- 1. Create the video_period_metrics table
CREATE TABLE IF NOT EXISTS video_period_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id TEXT NOT NULL REFERENCES videos(video_id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Numeric metrics
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  orders BIGINT DEFAULT 0,
  gmv NUMERIC DEFAULT 0,
  new_followers BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  engagement NUMERIC DEFAULT 0,
  click_to_order_rate NUMERIC DEFAULT 0,
  items_sold BIGINT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint: one record per video per period
  UNIQUE(video_id, period_start, period_end)
);

-- 2. Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_vpm_video_id ON video_period_metrics(video_id);
CREATE INDEX IF NOT EXISTS idx_vpm_period ON video_period_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_vpm_period_start ON video_period_metrics(period_start);
CREATE INDEX IF NOT EXISTS idx_vpm_gmv ON video_period_metrics(gmv DESC);

-- 3. Enable RLS (Row Level Security) - match videos table policy
ALTER TABLE video_period_metrics ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow public read access on video_period_metrics"
  ON video_period_metrics FOR SELECT
  USING (true);

-- Allow all authenticated users to insert/update/delete
CREATE POLICY "Allow public write access on video_period_metrics"
  ON video_period_metrics FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Create a database view that joins videos with aggregated metrics
-- This simplifies frontend queries significantly
CREATE OR REPLACE VIEW video_with_metrics AS
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
  -- Aggregated metrics from all periods
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
LEFT JOIN video_period_metrics m ON v.video_id = m.video_id
GROUP BY v.id, v.video_id, v.source_type, v.creator_name, v.creator_id,
         v.video_title, v.published_at, v.product_name, v.product_id,
         v.diagnosis, v.assigned_user_id, v.tags, v.raw_data,
         v.uploaded_by, v.created_at, v.updated_at;

-- 5. Create a function to get videos with metrics filtered by period
-- This is the main query used by the dashboard
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
  p_offset INT DEFAULT 0
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
      AND (p_search IS NULL OR v.video_title ILIKE '%' || p_search || '%')
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
