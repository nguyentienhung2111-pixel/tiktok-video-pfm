# Báo cáo Lỗi

## Trạng thái
ĐÃ ÁP DỤNG FIX (Phương án A) — chờ chạy migration trên Supabase và verify bằng UI

## Tóm tắt thay đổi đã áp dụng
- Migration mới: `supabase/migrations/create_videos_summary_function.sql` — tạo RPC `get_videos_summary_for_period(...)` trả về 1 hàng `{ total_gmv, total_views, total_orders, total_videos, total_creators }`, aggregate hoàn toàn ở DB.
- `src/lib/queries.ts` — thêm `fetchVideosSummary(params)` và type `VideosSummary`.
- `src/app/(main)/dashboard/page.tsx` — bỏ state `summaryVideos` (5000 hàng), scorecards lấy trực tiếp từ `summary`. Các fetch chạy song song bằng `Promise.all`.
- `src/app/(main)/team/content/page.tsx` — scorecards lấy từ `summary`; đổi tên `summaryVideos` → `leaderboardVideos` (vẫn limit 5000) chỉ phục vụ `productLeaderboard` top 5.
- `src/app/(main)/team/booking/page.tsx` — tương tự, "Số KOC đã lên clip" giờ dùng `summary.totalCreators` (DISTINCT ở DB) thay vì `Set` trên 5000 hàng.

## Ghi chú khi triển khai
- **Bắt buộc chạy migration**: file `create_videos_summary_function.sql` phải được apply lên Supabase trước khi deploy frontend, nếu không UI sẽ lỗi RPC not found.
- Leaderboard top-5 vẫn xài payload limit-5000. Top-5 theo GMV không bị ảnh hưởng vì RPC đã sort `gmv DESC`. Nếu sau này cần top-N lớn hoặc group-by chính xác trên dataset rất lớn, sẽ cần thêm RPC group-by riêng (deferred).

## Tiêu đề Lỗi
Tổng GMV toàn thời gian trên Dashboard nhỏ hơn tổng GMV của Brand và KOC do summary bị cắt ở `limit: 5000`.

## Mô tả Lỗi
Trên Trang Dashboard (`/dashboard`), scorecard "Tổng GMV" hiển thị giá trị nhỏ hơn cả "GMV Thương hiệu" (`/team/content`) hoặc "GMV từ KOC" (`/team/booking`) — trong khi về logic, Dashboard phải bằng tổng (Brand + KOC) vì cột `source_type` chỉ có hai giá trị `'brand' | 'koc'` (xem CHECK constraint tại `scripts/schema.sql:42`).

Cụ thể: scorecard được tính bằng cách `reduce` qua mảng `summaryVideos` mà mảng này được fetch với `limit: 5000`. RPC `get_videos_with_period_metrics` trả về **đã sort `gmv DESC` và LIMIT** ở cấp DB, nên client chỉ nhận top 5000 video theo GMV. Phần còn lại bị bỏ qua khi tính tổng.

Trang Brand và KOC fetch cùng RPC nhưng filter `source_type`, nên số video mỗi nhóm thường < 5000 → không bị cắt → sum đúng.

## Các bước tái hiện
1. Đảm bảo DB có > 5000 video (brand + KOC), với phân phối GMV không đồng đều giữa hai nguồn.
2. Mở `/dashboard`, để date range mặc định (1 năm), không lọc gì.
3. Ghi nhận giá trị scorecard "Tổng GMV".
4. Mở `/team/content`, ghi nhận "GMV Thương hiệu".
5. Mở `/team/booking`, ghi nhận "GMV từ KOC".
6. So sánh: Dashboard < Brand hoặc Dashboard < KOC, và Dashboard < (Brand + KOC).

## Kết quả Thực tế vs Kết quả Mong đợi
- **Thực tế:** `dashboard.totalGMV < brand.totalGMV + koc.totalGMV` và có thể `< max(brand, koc)`.
- **Mong đợi:** `dashboard.totalGMV == brand.totalGMV + koc.totalGMV` (vì `source_type ∈ {brand, koc}` là toàn bộ vũ trụ dữ liệu).

## Ngữ cảnh & Môi trường
- Stack: Next.js 16 App Router (client component), Supabase Postgres, RPC `get_videos_with_period_metrics`.
- Files liên quan:
  - `src/app/(main)/dashboard/page.tsx:64-69, 98` — fetch summary với `limit: 5000`, reduce client-side.
  - `src/app/(main)/team/content/page.tsx:64-65, 118` — tương tự, sourceType `'brand'`.
  - `src/app/(main)/team/booking/page.tsx:64-65, 144` — tương tự, sourceType `'koc'`.
  - `src/lib/queries.ts:28-66` — wrapper gọi RPC, mặc định `limit: 50`, các trang truyền 5000 cho summary.
  - `supabase/migrations/create_video_period_metrics.sql:99-215` — định nghĩa RPC `get_videos_with_period_metrics`, có `LIMIT p_limit OFFSET p_offset` ở cấp DB và `total_count` chỉ là COUNT(*) cho phân trang (không phải SUM).
- Không có RPC nào trả về aggregate (SUM) thực sự cho dải thời gian.

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

**Luồng tính `totalGMV` hiện tại (chung cho cả 3 trang):**

```
[Page] fetchVideosWithMetrics({ limit: 5000, offset: 0, ...filters })
                │
                ▼
[queries.ts] supabase.rpc('get_videos_with_period_metrics', { p_limit: 5000 })
                │
                ▼
[Postgres RPC]
   WITH filtered AS (
     SELECT v.*, SUM(m.gmv) AS gmv FROM videos v
     LEFT JOIN video_period_metrics m ON ... GROUP BY v.id
   )
   SELECT ... FROM filtered f, (SELECT COUNT(*)) t
   ORDER BY f.gmv DESC NULLS LAST
   LIMIT 5000  ← cắt ở đây
                │
                ▼
[Client] summaryVideos = data            // tối đa 5000 hàng
         totalGMV = summaryVideos.reduce(sum)  // chỉ cộng tối đa 5000
```

**Hệ quả khi tổng video > 5000:**

```
Tập video toàn bộ (giả sử 8000 video):
┌────────────────────────────────────────────┐
│ Top 5000 theo GMV  │  Bottom 3000 (bị bỏ) │
└────────────────────────────────────────────┘
       ▲
       │ Dashboard chỉ thấy phần này

Tập Brand (giả sử 2500 video) → không cắt → sum đầy đủ ✅
Tập KOC   (giả sử 5500 video) → cắt ở 5000 → sum thiếu phần đuôi ⚠️
```

**Tại sao nghịch lý "Dashboard < Brand"?**
Khi brand có ít video high-GMV còn KOC có nhiều video high-GMV, top 5000 của Dashboard có thể bị KOC chiếm chỗ, đẩy nhiều video Brand ra ngoài. Tổng dashboard bỏ qua những Brand video bị "đẩy ra", trong khi trang Brand (chỉ lọc brand) vẫn cộng đủ. Kết quả: `dashboard < brand`.

Ví dụ minh họa:
- Brand: 4000 video × 1.000đ = 4.000.000đ
- KOC: 6000 video × 100.000đ = 600.000.000đ
- Top 5000 toàn cục = 5000 KOC video (vì GMV cao hơn) → Dashboard = 500.000.000đ
- Trang Brand vẫn hiện 4.000.000đ (đúng), nhưng có thể không phải vấn đề chính.
- **Trang KOC hiện 600.000.000đ > Dashboard 500.000.000đ** → đúng triệu chứng.

**Vấn đề thiết kế:** scorecard tổng đang bị "ký sinh" trên cùng RPC dùng cho phân trang bảng. Việc fetch 5000 hàng chỉ để cộng dồn ở client còn vừa sai vừa lãng phí băng thông.

## Đề xuất Sửa lỗi (Proposed Fixes)

### ✅ Phương án A — Thêm RPC aggregate riêng (KHUYẾN NGHỊ)
Tạo một RPC mới ví dụ `get_videos_summary_for_period(period_start, period_end, source_type, ...)` trả về một hàng duy nhất `{ total_gmv, total_views, total_orders, total_videos }`. Aggregate hoàn toàn ở DB → không có giới hạn, không cần truyền 5000 hàng.

Frontend:
- Tách `fetchVideosWithMetrics` (lấy bảng + phân trang) khỏi `fetchVideosSummary` (lấy scorecards).
- Bỏ state `summaryVideos`, dùng `summary = { totalGMV, totalViews, totalOrders }` trực tiếp.
- Leaderboard (Brand/KOC) hiện cũng dựa trên `summaryVideos` — phần này cần một RPC group-by riêng (`get_top_creators`, `get_top_products`) hoặc tạm giữ `limit: 5000` rồi xử lý sau.

Ưu: Chính xác tuyệt đối, hiệu năng tốt nhất, scalable.
Nhược: Cần migration SQL mới + refactor 3 page + tách leaderboard.

### Phương án B — Tăng `limit` lên rất lớn (PATCH NHANH)
Đổi `limit: 5000` thành `limit: 100000` (hoặc bỏ hẳn LIMIT cho summary call).

Ưu: Một dòng sửa, không cần migration.
Nhược: Vẫn có ngưỡng cứng, băng thông tệ (tải toàn bộ video mỗi lần render scorecard), thời gian load tăng theo số video, không bền vững.

### Phương án C — Hybrid: tách thêm tham số `p_skip_limit BOOLEAN` cho RPC hiện tại
Sửa RPC để khi `p_skip_limit = true` thì bỏ `LIMIT/OFFSET`. Frontend gọi 2 lần: lần lấy summary (skip limit, chỉ select cột cần SUM), lần lấy table (limit + offset).

Ưu: Reuse RPC.
Nhược: Vẫn truyền nhiều hàng cho summary; chỉ tốt hơn B chút.

**Khuyến nghị: Phương án A.** Việc dồn aggregate xuống DB đúng nguyên tắc và sửa được cả 3 trang cùng lúc. Phương án B chấp nhận được nếu cần hotfix ngay trước khi triển khai A.

## Kế hoạch Xác minh
1. **Sanity check toán học:** Sau fix, kiểm tra `dashboard.totalGMV ≈ brand.totalGMV + koc.totalGMV` (sai số làm tròn cho phép). Cần test trên dataset có > 5000 video.
2. **SQL spot check:** Chạy trực tiếp trên Supabase:
   ```sql
   SELECT
     SUM(m.gmv) FILTER (WHERE v.source_type = 'brand') AS brand_gmv,
     SUM(m.gmv) FILTER (WHERE v.source_type = 'koc')   AS koc_gmv,
     SUM(m.gmv) AS total_gmv
   FROM videos v
   LEFT JOIN video_period_metrics m ON v.video_id = m.video_id
   WHERE m.period_start >= '<from>' AND m.period_end <= '<to>';
   ```
   Đối chiếu 3 con số với UI.
3. **Edge case:** filter date range hẹp (chỉ 1 ngày), filter productId, filter search → vẫn phải bảo toàn `dashboard = brand + koc`.
4. **Performance:** đo thời gian load `/dashboard` trước và sau (kỳ vọng giảm đáng kể vì không tải 5000 hàng).
5. **Regression:** đảm bảo bảng video, phân trang, leaderboard vẫn đúng.
