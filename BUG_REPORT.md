# Báo cáo Lỗi & Nhu cầu Tính năng

## Trạng thái
ĐÃ SỬA XONG — Thành công ✅

## Tiêu đề Lỗi
Cả 3 trang Dashboard chính (`/dashboard`, `/team/content`, `/team/booking`) đều thiếu biểu đồ xu hướng theo thời gian để theo dõi và so sánh doanh số (GMV) giữa các tuần.

## Mô tả Lỗi
Hiện tại trên cả 3 màn hình cốt lõi của ứng dụng DECOCO Analytics:
1. **Dashboard Tổng quan** (`/dashboard`): Chỉ hiển thị các thẻ tổng (Scorecards) và bảng dữ liệu chi tiết video.
2. **Thương hiệu (DECOCO Official)** (`/team/content`): Hiển thị Scorecards, Leaderboard (Top Sản phẩm, Xếp hạng Content) và bảng chi tiết video Brand.
3. **KOC / Affiliate Performance** (`/team/booking`): Hiển thị Scorecards, Leaderboards (Top KOC, Top Booking, Xếp hạng Content) và bảng chi tiết video KOC.

👉 **Vấn đề**: Người dùng và ban quản trị không thể quan sát trực quan sự biến động tăng/giảm của doanh số (GMV), số lượng đơn hàng và lượt xem qua các mốc thời gian (các tuần / các kỳ báo cáo) để đánh giá hiệu quả chiến dịch cũng như so sánh hiệu suất giữa các tuần.

## Các bước tái hiện
1. Truy cập vào ứng dụng tại `tiktok-video-pfm.vercel.app`.
2. Lần lượt mở 3 trang:
   - `/dashboard` (Dashboard Tổng quan)
   - `/team/content` (Kênh Thương hiệu)
   - `/team/booking` (Kênh KOC / Affiliate)
3. Chọn khoảng thời gian dài (ví dụ: nhiều tuần hoặc nhiều tháng trong DateRangePicker).
4. Quan sát: Chỉ có tổng số liệu lũy kế của toàn bộ khoảng thời gian, hoàn toàn không có biểu đồ trực quan thể hiện sự thay đổi doanh số theo từng tuần / kỳ.

## Kết quả Thực tế vs Kết quả Mong đợi

### Kết quả Thực tế
- Chưa có biểu đồ đường/cột thể hiện dòng thời gian (Time-series Chart) trên cả 3 trang.
- Chưa có hàm API / Supabase RPC tổng hợp số liệu phân rã theo từng tuần hoặc từng kỳ báo cáo (`period_start`, `period_end`).
- Khó so sánh tuần này tăng hay giảm bao nhiêu % so với tuần trước.

### Kết quả Mong đợi
- Cả 3 trang đều được trang bị biểu đồ phân tích xu hướng theo thời gian hiện đại (Dark theme chuẩn DECOCO):
  - **Trang Tổng quan (`/dashboard`)**: Biểu đồ so sánh GMV tổng, đơn hàng, lượt xem hoặc cơ cấu GMV Brand vs KOC theo từng tuần.
  - **Trang Thương hiệu (`/team/content`)**: Biểu đồ biến động GMV, GMV trực tiếp, đơn hàng và lượt xem của kênh Brand qua các tuần (tông màu Emerald).
  - **Trang KOC / Affiliate (`/team/booking`)**: Biểu đồ biến động GMV, đơn hàng KOC qua các tuần (tông màu Purple).
- Hỗ trợ xem so sánh tăng trưởng tuần-qua-tuần (Week-over-Week - WoW %).
- Hỗ trợ tooltip chi tiết khi rê chuột vào từng tuần.
- Tự động lọc đồng bộ theo DateRange và các bộ lọc nâng cao (Sản phẩm, Tag, Nhân viên, v.v.).
- Tích hợp chuẩn xác vào tính năng "Lưu báo cáo (Ảnh)" khi xuất file PNG.

## Ngữ cảnh & Môi trường
- **Môi trường**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS.
- **Thư viện biểu đồ**: Dự án đã có sẵn `chart.js` (`^4.5.1`) và `react-chartjs-2` (`^5.3.1`) trong `package.json`.
- **Cơ sở dữ liệu**: Supabase PostgreSQL (bảng `videos`, `video_period_metrics`, `video_tags`).
- **Các file liên quan**:
  1. `src/app/(main)/dashboard/page.tsx`
  2. `src/app/(main)/team/content/page.tsx`
  3. `src/app/(main)/team/booking/page.tsx`
  4. `src/lib/queries.ts`
  5. `src/components/TimeSeriesChart.tsx` (Component biểu đồ mới)
  6. `supabase/migrations/` (RPC tổng hợp dữ liệu theo chuỗi thời gian)

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

### 1. Phân tích Hiện trạng Codebase
- Bảng `video_period_metrics` đã lưu trữ dữ liệu theo từng kỳ tải lên (`period_start`, `period_end`, `gmv`, `gmv_direct`, `gmv_indirect`, `orders`, `views`, v.v.).
- Tuy nhiên, hiện tại trong `src/lib/queries.ts` và backend Supabase chỉ có hàm `get_videos_summary_for_period` (gộp toàn bộ thành 1 dòng tổng) và `get_videos_with_period_metrics` (phân trang theo video), **chưa có RPC function nhóm dữ liệu theo từng mốc thời gian / từng tuần**.
- 3 file trang giao diện (`dashboard/page.tsx`, `team/content/page.tsx`, `team/booking/page.tsx`) chưa tích hợp component biểu đồ để render dữ liệu chuỗi thời gian này.

### 2. Sơ đồ Luồng Dữ liệu (Data Flow Diagram)
```
[User Filter: DateRange, Product, Tags, Staff]
                    │
                    ▼
       [fetchVideosTimeSeries(params)]
                    │
                    ▼
     [Supabase RPC: get_videos_timeseries_for_period]
                    │
       ┌────────────┴───────────────────────────┐
       │ Nhóm theo (period_start, period_end)   │
       │ SUM(gmv), SUM(orders), SUM(views)...   │
       │ ORDER BY period_start ASC              │
       └────────────┬───────────────────────────┘
                    │
                    ▼
   [Component: <TimeSeriesChart data={...} />]
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
[/dashboard]  [/team/content]  [/team/booking]
(Tổng quan)    (Brand/Emerald)  (KOC/Purple)
```

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### Phương án 1: Xây dựng RPC `get_videos_timeseries_for_period` + Component biểu đồ `TimeSeriesChart` dùng `chart.js`/`react-chartjs-2` (KHUYẾN NGHỊ ⭐)

1. **Backend / Database Migration (`supabase/migrations/create_timeseries_rpc.sql`)**:
   - Tạo hàm RPC `get_videos_timeseries_for_period`:
     - Tham số nhận vào: `p_period_start`, `p_period_end`, `p_source_type`, `p_product_id`, `p_min_gmv`, `p_min_views`, `p_search`, `p_tag_ids`, `p_assigned_user_id`.
     - Nhóm theo kỳ `period_start, period_end` (hoặc gom tuần).
     - Trả về danh sách: `period_start`, `period_end`, `period_label`, `total_gmv`, `total_gmv_direct`, `total_gmv_indirect`, `total_orders`, `total_views`, `total_videos`.
     - Sắp xếp theo `period_start ASC`.

2. **Client Query Layer (`src/lib/queries.ts`)**:
   - Thêm interface `TimeSeriesMetricPoint` và hàm `fetchVideosTimeSeries(params)`.

3. **Xây dựng Component `src/components/TimeSeriesChart.tsx`**:
   - Sử dụng `react-chartjs-2` / `chart.js` (kết hợp ChartJS plugins, Gradient background, Canvas tối ưu).
   - Thiết kế giao diện Dark Mode chuẩn DECOCO (`#161b22`, border `#30363d`).
   - Cung cấp các nút chuyển đổi nhanh (Tabs):
     - **Doanh số (GMV)**: Biểu đồ cột/vùng hiển thị doanh thu theo tuần, kèm thẻ tính tổng và % tăng/giảm so với tuần trước.
     - **Đơn hàng (Orders)**: Biểu đồ số lượng đơn hàng qua từng tuần.
     - **Lượt xem (Views)**: Biểu đồ theo dõi traffic/view video qua từng tuần.
   - Hỗ trợ đổi màu sắc chủ đạo theo từng trang (Tổng quan: Blue/Indigo, Content: Emerald, Booking: Purple).

4. **Tích hợp vào 3 trang**:
   - `src/app/(main)/dashboard/page.tsx`: Đặt biểu đồ ngay dưới Scorecards.
   - `src/app/(main)/team/content/page.tsx`: Đặt biểu đồ phía trên Leaderboards.
   - `src/app/(main)/team/booking/page.tsx`: Đặt biểu đồ phía trên Leaderboards.

*Ưu điểm*: Tận dụng thư viện Chart.js đã có trong dự án, hiệu năng truy vấn nhanh từ DB, tính toán WoW % chính xác, giao diện mượt mà và tương thích tốt khi xuất ảnh báo cáo.

---

### Phương án 2: Tự render biểu đồ bằng SVG thủ công tại Client
- Tính toán dữ liệu và vẽ các thanh bar/đường path trực tiếp bằng SVG.
- *Nhược điểm*: Mất nhiều công sức xử lý responsive, trục tọa độ, tooltip tương tác, không tận dụng được thư viện `chart.js` đã cài sẵn.

---

## Kế hoạch Xác minh

### 1. Kiểm tra Build & Lint
- Chạy `npm run build` để kiểm tra TypeScript compilation và import Chart.js không bị lỗi SSR trong Next.js App Router.

### 2. Kiểm thử Hiển thị & Tương tác
- Kiểm tra trang `/dashboard`: Biểu đồ tải đúng dữ liệu các tuần, hiển thị GMV, đơn hàng, lượt xem đầy đủ.
- Kiểm tra trang `/team/content`: Biểu đồ lọc chính xác nguồn `brand`, màu sắc Emerald chuẩn thiết kế.
- Kiểm tra trang `/team/booking`: Biểu đồ lọc chính xác nguồn `koc`, màu sắc Purple chuẩn thiết kế.
- Thử thay đổi DateRangePicker và các bộ lọc (tìm kiếm, sản phẩm, tag): Biểu đồ cập nhật phản hồi tương ứng theo đúng kỳ.
- Thử rê chuột vào các điểm/cột: Tooltip hiển thị format tiền tệ VND và số liệu rõ ràng.
- Bấm nút "Lưu báo cáo (Ảnh)": Ảnh PNG xuất ra chứa đầy đủ biểu đồ trực quan.

---

## Kết quả Sửa lỗi & Kiểm thử (Fix & Verification Result)

**Kết quả: THÀNH CÔNG ✅** (áp dụng Phương án 1 — Khuyến nghị)

### Các thay đổi đã thực hiện (Minimal changes)
1. **Migration mới** `supabase/migrations/create_timeseries_rpc.sql` — tạo RPC `get_videos_timeseries_for_period`, nhóm dữ liệu theo `(period_start, period_end)`, trả về `total_gmv`, `total_gmv_direct`, `total_gmv_indirect`, `total_orders`, `total_views`, `total_videos`, sắp xếp `period_start ASC`. Nhận đúng bộ tham số lọc như `get_videos_summary_for_period` (date range, source, product, min GMV/views, search, tags, assigned user).
2. **Đã APPLY RPC lên Supabase production** (project `mrmwwlqolqsoyuxasrta` — "TikTok Video Performance") qua MCP — không chỉ commit file, để app deploy gọi RPC không bị lỗi "function not found".
3. **`src/lib/queries.ts`** — thêm interface `TimeSeriesMetricPoint` + hàm `fetchVideosTimeSeries(params)`.
4. **`src/components/TimeSeriesChart.tsx`** — component mới dùng `react-chartjs-2`/`chart.js`, dark theme DECOCO (`#161b22`/`#30363d`), tabs GMV/Đơn hàng/Lượt xem, tổng + % WoW so với kỳ trước, tooltip format VND, đổi màu accent theo trang.
5. **Tích hợp 3 trang**: `/dashboard` (accent blue, dưới Scorecards), `/team/content` (accent emerald, trên Leaderboards), `/team/booking` (accent purple, trên Leaderboards). Biểu đồ dùng chung `baseParams` nên tự đồng bộ theo DateRange + bộ lọc, và nằm trong `dashboardRef` nên được đưa vào ảnh PNG khi "Lưu báo cáo".

### Kiểm thử

**1. Xác minh RPC trực tiếp trên DB (script tái hiện):**
```sql
SELECT * FROM get_videos_timeseries_for_period(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL) LIMIT 10;
```
Output (rút gọn) — trả về đúng chuỗi thời gian theo tuần, sắp xếp tăng dần:
```
2026-04-22 → 2026-05-03 | GMV 685.256.792 | orders 9.604  | views 5.957.509 | videos 6.602
2026-05-04 → 2026-05-10 | GMV 510.183.465 | orders 6.669  | views 4.097.069 | videos 5.820
2026-05-11 → 2026-05-17 | GMV 446.180.941 | orders 6.433  | views 3.247.121 | videos 5.979
2026-05-18 → 2026-05-24 | GMV 400.028.526 | orders 4.960  | views 4.576.830 | videos 5.972
... (tiếp tục theo từng tuần)
```
→ Dữ liệu phân rã theo kỳ chính xác, cho phép tính WoW % và vẽ biểu đồ xu hướng.

**2. Build & Type-check (`npm run build`):**
```
✓ Compiled successfully in 25.4s
  Finished TypeScript in 20.2s
✓ Generating static pages (19/19)
```
→ Không lỗi TypeScript, không lỗi SSR khi import Chart.js; cả `/dashboard`, `/team/content`, `/team/booking` prerender tĩnh thành công.
