-- Defense in depth: chỉ cho phép tài khoản đã đăng nhập đọc/ghi dữ liệu metrics.
-- Trước đây cả policy SELECT lẫn policy FOR ALL đều dùng USING (true) cho role public
-- (kể cả anon). Lưu ý: policy FOR ALL cũng áp dụng cho SELECT và các policy được OR
-- với nhau, nên chỉ siết mỗi policy SELECT là CHƯA đủ — anon vẫn đọc được qua policy ALL.
-- Vì vậy phải siết cả hai về role `authenticated`.
--
-- Đã áp dụng trên project TikTok Video Performance (ref: mrmwwlqolqsoyuxasrta)
-- và xác minh: anon SELECT = 0 rows, authenticated SELECT = 70265 rows.

DROP POLICY IF EXISTS "Allow public read access on video_period_metrics" ON video_period_metrics;

CREATE POLICY "Allow authenticated read access on video_period_metrics"
  ON video_period_metrics FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public write access on video_period_metrics" ON video_period_metrics;

CREATE POLICY "Allow authenticated write access on video_period_metrics"
  ON video_period_metrics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
