# Báo cáo Lỗi: Số liệu hiển thị không nhất quán trên bảng "TOP NHÂN VIÊN BOOKING"

## Trạng thái
ĐÃ SỬA — Thành công

## Kết quả Kiểm thử

### Thay đổi đã áp dụng (Phương án 1)
1. **Database migration** — `supabase/migrations/create_leaderboard_rpcs.sql` (đã apply lên Supabase):
   - `get_top_booking_staff_leaderboard(...)` → GROUP BY `assigned_user_id`, `SUM(gmv)`, `COUNT(DISTINCT creator_id)`, LEFT JOIN `profiles` để lấy `display_name`. Áp dụng đủ các filter: period, source_type, product_id, min_gmv, min_views, search, tag_ids, assigned_user_id.
   - `get_top_kocs_leaderboard(...)` → GROUP BY `creator_id`, cùng bộ filter.
   - Cả hai đều `ORDER BY total_gmv DESC, <id> ASC` và LIMIT 5.
2. **Frontend** — `src/app/(main)/team/booking/page.tsx`:
   - Bỏ state `leaderboardVideos` và lời gọi `fetchVideosWithMetrics({ limit: 5000 })` (lời gọi bị PostgREST cắt cứng ở 1000 dòng).
   - Bỏ 2 khối `useMemo` (`kocLeaderboard`, `staffLeaderboard`) gom nhóm client-side.
   - Gọi trực tiếp 2 RPC mới song song trong `fetchData`, map kết quả thành `LeaderboardEntry[]`.
3. **Script kiểm thử hồi quy**: `scratch/test_booking_leaderboard.mjs`.

### Kết quả chạy test
```
All-staff leaderboard:
  Quỳnh Anh BOOKING: gmv=4000672888, kocs=2321, videos=5898
  Linh Chi BOOKING: gmv=260634592, kocs=110, videos=285
  Ngọc Ánh BOOKING: gmv=46375389, kocs=67, videos=269
  Thuỳ Linh BOOKING: gmv=11887167, kocs=9, videos=28
Linh Chi solo: gmv=260634592, kocs=110, videos=285
Cross-checked all top-staff rows against per-staff RPC ✓
Top KOCs returned: 5 rows
✅ PASS: Leaderboards consistent across filters (Linh Chi: 260.634.592đ, 110 KOCs).
```

- **Trước fix:** Linh Chi BOOKING ở "Tất cả nhân viên" hiển thị **256.385.428đ / 19 KOCs** (sai), ở "Linh Chi BOOKING" hiển thị **260.634.592đ / 110 KOCs** (đúng).
- **Sau fix:** Cả 2 chế độ lọc đều cho **260.634.592đ / 110 KOCs**. Test còn cross-check toàn bộ 4 staff trong leaderboard, mọi cặp số liệu trùng khớp.
- **Bonus performance:** Frontend không còn tải 1000 dòng video chỉ để gom nhóm 5 dòng — mỗi RPC chỉ trả về đúng 5 dòng gọn nhẹ.
- **Kết luận:** **Thành công ✅**

## Tiêu đề Lỗi
Số liệu GMV và số lượng KOC của nhân viên trên bảng "TOP NHÂN VIÊN BOOKING" không nhất quán và bị thiếu hụt nghiêm trọng khi lọc "Tất cả nhân viên" so với khi lọc "Chỉ nhân viên đó".

## Mô tả Lỗi
Tại trang **KOC / Affiliate Performance** (`/team/booking`), số liệu của các nhân viên phụ trách booking hiển thị tại bảng **TOP NHÂN VIÊN BOOKING** bị thay đổi không nhất quán tùy thuộc vào bộ lọc "Nhân viên phụ trách" được chọn:

- **Khi lọc "Tất cả nhân viên" (mặc định):**
  - Hệ thống báo *Linh Chi BOOKING* đạt tổng GMV là **256.385.428 đ** và **Phụ trách 19 KOCs**.
- **Khi lọc đích danh "Linh Chi BOOKING":**
  - Hệ thống báo *Linh Chi BOOKING* đạt tổng GMV là **260.634.592 đ** và **Phụ trách 110 KOCs**.

Sự chênh lệch này xảy ra do logic Frontend tải danh sách chi tiết các clips qua RPC `get_videos_with_period_metrics` để tính toán (nhóm và cộng dồn) bảng xếp hạng trực tiếp trên Client. Do API PostgREST của Supabase giới hạn cứng tối đa 1000 dòng phản hồi trên mỗi request (`max_rows = 1000`), client chỉ nhận được tối đa 1000 video clips có GMV cao nhất trên toàn cục khi lọc "Tất cả nhân viên". Toàn bộ các clips hiệu suất thấp hơn của cô ấy (nằm ngoài top 1000 toàn cục) bị cắt xén hoàn toàn, làm thiếu hụt nghiêm trọng cả doanh thu tổng lẫn số KOC thực tế.

## Các bước tái hiện
1. Đăng nhập hệ thống và đi tới trang **KOC / Affiliate** (`/team/booking`).
2. Giữ nguyên bộ lọc **Nhân viên phụ trách** ở trạng thái mặc định **Tất cả nhân viên**.
3. Quan sát và ghi lại số liệu của *Linh Chi BOOKING* tại bảng xếp hạng **TOP NHÂN VIÊN BOOKING** (Ví dụ: `256.385.428 đ`, `Phụ trách 19 KOCs`).
4. Mở **Bộ lọc nâng cao**, tại trường **Nhân viên phụ trách**, chọn **Linh Chi BOOKING**.
5. Quan sát lại số liệu hiển thị tại bảng xếp hạng: Số liệu lúc này tăng lên **260.634.592 đ** và **Phụ trách 110 KOCs**.

## Kết quả Thực tế vs Kết quả Mong đợi
- **Kết quả Thực tế:** Số liệu tổng GMV và số lượng KOC phụ trách bị sai lệch, thiếu hụt lớn khi xem ở chế độ "Tất cả nhân viên" so với chế độ xem riêng.
- **Kết quả Mong đợi:** Số liệu của từng nhân viên tại bảng xếp hạng phải hoàn toàn chính xác, nhất quán và đầy đủ ở mọi chế độ lọc.

## Ngữ cảnh & Môi trường
- **Trang bị ảnh hưởng:** `/team/booking` (KOC / Affiliate)
- **Tệp tin liên quan:** `src/app/(main)/team/booking/page.tsx`
- **Thành phần ảnh hưởng:** State `leaderboardVideos` và `staffLeaderboard` ( logic gom nhóm client-side).
- **Hàm database liên quan:** RPC `get_videos_with_period_metrics` (`supabase/migrations/add_assigned_user_filter_to_rpcs.sql`).

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

Supabase API (PostgREST) áp dụng giới hạn cứng `max_rows = 1000` trên mỗi HTTP request để bảo vệ hiệu năng hệ thống. 

Trong tệp `src/app/(main)/team/booking/page.tsx`, khi tải dữ liệu cho bảng xếp hạng, frontend thực hiện yêu cầu:
```typescript
fetchVideosWithMetrics({ ...baseParams, limit: 5000, offset: 0 })
```
Mặc dù frontend yêu cầu `limit: 5000`, API của Supabase vẫn chỉ trả về tối đa **1000 dòng**.

### So sánh cơ chế hoạt động của 2 trường hợp lọc:

#### 1. Khi chọn bộ lọc "Tất cả nhân viên"
- `p_assigned_user_id` gửi lên database là `NULL`.
- Server trả về **1000 clips có GMV cao nhất trên toàn hệ thống** (trong tổng số hơn 7,200 clips).
- Client nhận 1000 dòng này và chạy hàm `useMemo` để tính toán:
  - Bất kỳ video nào của KOC được phân cho *Linh Chi BOOKING* mà **không nằm trong Top 1000 video toàn cục** (vì có GMV thấp hơn) sẽ bị loại bỏ hoàn toàn khỏi phép tính.
  - Kết quả: Tổng GMV bị hụt (chỉ tính các video lọt top) và số KOC phụ trách bị giảm mạnh xuống còn **19 KOC** (chỉ đếm các KOC có video lọt top 1000 toàn cục).

#### 2. Khi lọc đích danh "Linh Chi BOOKING"
- `p_assigned_user_id` gửi lên database là ID của Linh Chi (`66d67932-4152-4fd8-ad5b-0c278622a10e`).
- Server thực hiện lọc trực tiếp dưới SQL, chỉ quét và trả về các video thuộc về Linh Chi.
- Vì tổng số video Linh Chi phụ trách trong DB là **285 clips** (nhỏ hơn giới hạn 1000), PostgREST trả về đầy đủ cả 285 dòng mà không bị cắt xén.
- Client nhận đủ 285 dòng và tính toán chính xác tuyệt đối: **260.634.592 đ** và **110 KOCs**.

### Sơ đồ luồng dữ liệu (Data Flow Diagram)

```ascii
Trường hợp 1: Lọc "Tất cả nhân viên"
 [Cơ sở dữ liệu] (7,287 clips)
       │
       ▼ Gọi RPC get_videos_with_period_metrics (limit: 5000, p_assigned_user_id = NULL)
 [Supabase API / PostgREST]
  - Phát hiện truy vấn lớn hơn max_rows
  - Áp dụng cấu hình mặc định: max_rows = 1000
       │
       ▼ Trả về 1000 clips có GMV lớn nhất hệ thống
 [Frontend Client]
  - Thực hiện gom nhóm `staffMap` trực tiếp từ mảng 1000 dòng này
       │
       ▼
 [Linh Chi BOOKING] hiển thị: 256.385.428đ & 19 KOCs (Bị mất clips ngoài Top 1000)


Trường hợp 2: Lọc riêng "Linh Chi BOOKING"
 [Cơ sở dữ liệu] (7,287 clips)
       │
       ▼ Gọi RPC (limit: 5000, p_assigned_user_id = '<Linh Chi ID>')
 [Supabase API / PostgREST]
  - Lọc SQL dưới DB chỉ lấy clips của Linh Chi (tổng cộng 285 dòng)
  - Vì 285 < max_rows 1000, trả về đầy đủ 285 dòng
       │
       ▼ Trả về toàn bộ 285 clips của Linh Chi
 [Frontend Client]
  - Gom nhóm `staffMap` từ 285 dòng đầy đủ này
       │
       ▼
 [Linh Chi BOOKING] hiển thị: 260.634.592đ & 110 KOCs (Chính xác tuyệt đối)
```

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### Phương án 1: Tạo các hàm RPC chuyên dụng phía Server (Server-side Aggregation) - *Khuyến nghị tối ưu*
Thay vì tải toàn bộ chi tiết video về client để tính toán thủ công (rất tốn băng thông và dễ lỗi do giới hạn dòng), chúng ta sẽ tạo các hàm RPC gom nhóm trực tiếp dưới PostgreSQL:
1. **Tạo RPC `get_top_booking_staff_leaderboard`:**
   - Thực hiện gom nhóm `GROUP BY assigned_user_id` từ bảng `videos` (LEFT JOIN với `video_period_metrics`).
   - Tính tổng GMV (`COALESCE(SUM(gmv), 0)`) và đếm số KOC duy nhất (`COUNT(DISTINCT creator_id)`).
   - Áp dụng đầy đủ các bộ lọc ngày tháng, sản phẩm, tag.
   - Sắp xếp theo GMV giảm dần và giới hạn trả về tối đa 5 dòng.
2. **Tạo RPC `get_top_kocs_leaderboard`:**
   - Thực hiện gom nhóm `GROUP BY creator_id` để lấy danh sách TOP KOCs.
3. **Frontend:**
   - Gọi trực tiếp 2 hàm RPC này để lấy dữ liệu xếp hạng hiển thị.
- **Ưu điểm:**
  - Chính xác 100%, nhất quán ở mọi chế độ lọc.
  - Cực kỳ tối ưu hiệu năng: Thay vì trình duyệt phải tải và xử lý mảng JSON 1,000 dòng, nay nó chỉ cần tải về đúng 5 dòng dữ liệu xếp hạng gọn nhẹ.
- **Nhược điểm:** Cần viết thêm SQL migrations để tạo 2 hàm RPC mới trong database.

### Phương án 2: Tải tích lũy clips bằng Batching ở Frontend (Client-side Accumulation)
Tương tự như cách sửa lỗi KOC Mapping, ta viết vòng lặp tải toàn bộ video clips trong kỳ về frontend theo từng đợt `.range()` trước khi chạy hàm `useMemo` gom nhóm.
- **Ưu điểm:** Chỉ sửa code frontend, không cần can thiệp database.
- **Nhược điểm:** Hiệu năng cực kỳ kém. Khi database có hàng chục nghìn video, việc bắt trình duyệt tải toàn bộ video về chỉ để làm một bảng xếp hạng 5 dòng sẽ gây đơ và lag trang web cực kỳ nghiêm trọng. Không khuyến nghị sử dụng phương án này.

---

## Kế hoạch Xác minh

1. **Xác minh số liệu khớp nhau:**
   - Sau khi áp dụng sửa đổi, kiểm tra bảng xếp hạng **TOP NHÂN VIÊN BOOKING** ở chế độ lọc "Tất cả nhân viên". 
   - Số liệu của *Linh Chi BOOKING* phải hiển thị chính xác là `260.634.592 đ` và `Phụ trách 110 KOCs` (hoặc khớp hoàn toàn với số liệu khi lọc riêng cô ấy).
2. **Đối chiếu chéo:**
   - Thực hiện kiểm tra tương tự với các nhân viên khác như *Quỳnh Anh BOOKING*, *Ngọc Ánh BOOKING*,... Đảm bảo số liệu hiển thị đồng nhất ở cả 2 chế độ lọc.
