-- Defense in depth: chỉ cho phép tài khoản đã đăng nhập đọc dữ liệu metrics.
-- Trước đây policy SELECT dùng USING (true) cho mọi role (kể cả anon),
-- khiến client chưa đăng nhập (anon key) vẫn truy vấn được toàn bộ metrics.
--
-- LƯU Ý: Chạy migration này trên đúng project của app TikTok
-- (NEXT_PUBLIC_SUPABASE_URL = mrmwwlqolqsoyuxasrta.supabase.co).

DROP POLICY IF EXISTS "Allow public read access on video_period_metrics" ON video_period_metrics;

CREATE POLICY "Allow authenticated read access on video_period_metrics"
  ON video_period_metrics FOR SELECT
  TO authenticated
  USING (true);
