-- =================================================================
-- Migration: Create video_with_metrics view
-- Purpose:  The view was originally declared inside
--           create_video_period_metrics.sql but never made it to the
--           remote project (that file was applied piecemeal). Pages
--           like /admin/koc-mapping rely on aggregated gmv per video
--           and currently read stale 0 values from videos.gmv.
--           This migration brings the view into the remote DB so the
--           frontend can SELECT it directly.
-- =================================================================

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
