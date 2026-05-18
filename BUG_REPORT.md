# Báo cáo Lỗi

## Trạng thái
ĐÃ SỬA CHỮA LỖI 1, 2, 3 — THÀNH CÔNG (2026-05-18)

## Tiêu đề Lỗi
1. Nút "Xoá lần upload gần nhất" không phân biệt tab Thương hiệu (Brand) hay KOC / Affiliate. (Đã sửa)
2. Thanh tìm kiếm không hoạt động khi tìm theo ID hoặc tên của KOC (Creator). (Đã sửa)
3. Cột "Tổng GMV" trong màn hình Quản lý Booking KOC hiển thị 0₫ cho tất cả KOC.

## Mô tả Lỗi
**Lỗi 3:** Trên trang Quản lý Booking KOC (`/admin/koc-mapping`), danh sách hiển thị tất cả các KOC/Affiliate cùng số lượng video của họ, tuy nhiên cột Tổng GMV luôn hiển thị là 0₫ dù thực tế các video của họ có doanh thu.

## Các bước tái hiện
**Lỗi 3:**
1. Truy cập vào trang "Quản lý Booking KOC" trên thanh menu (hoặc đường dẫn `/admin/koc-mapping`).
2. Quan sát bảng "Danh sách KOC & Phân bổ nhân viên".
3. Nhìn vào cột "Tổng GMV", tất cả các dòng đều hiển thị `0 ₫`.

## Kết quả Thực tế vs Kết quả Mong đợi
- **Lỗi 3 Thực tế:** Tất cả các KOC đều có Tổng GMV bằng 0.
- **Lỗi 3 Mong đợi:** Tổng GMV phải được tính bằng cách cộng dồn GMV của tất cả các video thuộc KOC đó.

## Ngữ cảnh & Môi trường
- Trang: `/admin/koc-mapping`
- Component: `src/app/(main)/admin/koc-mapping/page.tsx`
- Database: Bảng `videos`, view `video_with_metrics`, bảng `video_period_metrics`

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

### Lỗi 3: Cột Tổng GMV hiện 0
Trong file `src/app/(main)/admin/koc-mapping/page.tsx`, hệ thống thực hiện fetch dữ liệu để tính tổng GMV bằng câu truy vấn sau:
```javascript
const { data: videos, error: vError } = await supabase
  .from('videos')
  .select('creator_id, creator_name, assigned_user_id, gmv')
  .eq('source_type', 'koc');
```
Tuy nhiên, trong kiến trúc cơ sở dữ liệu hiện tại (được thay đổi từ đợt migration `create_video_period_metrics`), bảng `videos` không còn lưu trữ trực tiếp các chỉ số metric như `gmv`, `views`, v.v. Các chỉ số này đã được chuyển sang bảng `video_period_metrics` và lưu theo từng kỳ báo cáo.

Để lấy được các chỉ số tổng gộp, hệ thống đã tạo sẵn một View trong Database tên là `video_with_metrics` (kết hợp dữ liệu giữa `videos` và `video_period_metrics`). Vì trang `koc-mapping` vẫn đang query trực tiếp vào bảng gốc `videos` nên giá trị `gmv` trả về luôn bị sai/bằng 0.

```ascii
[KOCMappingPage] 
  │
  ├── Query -> Bảng `videos` 
  │             (chỉ có metadata, không có gmv -> gmv = 0)
  │
  └── Lẽ ra phải query -> View `video_with_metrics` 
                           (đã JOIN sẵn tổng gmv từ video_period_metrics)
```

## Đề xuất Sửa lỗi (Proposed Fixes)

### Lỗi 3
- **Phương án 1 (Khuyến nghị):** Sửa lại câu truy vấn Supabase trong `src/app/(main)/admin/koc-mapping/page.tsx` để lấy dữ liệu từ view `video_with_metrics` thay vì bảng `videos`.
```javascript
// Đổi 'videos' thành 'video_with_metrics'
const { data: videos, error: vError } = await supabase
  .from('video_with_metrics')
  .select('creator_id, creator_name, assigned_user_id, gmv')
  .eq('source_type', 'koc');
```

## Kế hoạch Xác minh
1. **Lỗi 3:** Mở trang "Quản lý Booking KOC". Kiểm tra cột "Tổng GMV" của các KOC (ví dụ: `decoco.accessories`, `gnudaxuan_0102`) xem đã hiển thị số tiền chính xác thay vì `0 ₫` hay chưa. (Có thể so sánh chéo với GMV của KOC đó trên Dashboard để chắc chắn số liệu đúng).

---
*(Phần phân tích và sửa chữa cho Lỗi 1 và Lỗi 2 đã được lưu trữ lại ở các báo cáo trước)*

---

## Kết quả Sửa chữa & Xác minh Lỗi 3 (2026-05-18)

### Điều chỉnh Kế hoạch
Khi review, phát hiện view `video_with_metrics` được khai báo trong file `create_video_period_metrics.sql` **chưa từng được apply lên DB remote** (`list_migrations` không thấy migration này). Do đó chỉ đổi câu query thôi sẽ không đủ — cần migration mới để tạo view trước. Đây là điều chỉnh duy nhất so với "Đề xuất Sửa lỗi" gốc.

### Các thay đổi đã áp dụng
- `supabase/migrations/create_video_with_metrics_view.sql` (mới): `CREATE OR REPLACE VIEW video_with_metrics` (JOIN `videos` với `video_period_metrics`, group theo video, SUM gmv/views/orders/…). Đã apply lên Supabase project `mrmwwlqolqsoyuxasrta`.
- `src/app/(main)/admin/koc-mapping/page.tsx` (1 dòng đổi `.from()`): chuyển từ `.from('videos')` sang `.from('video_with_metrics')`. Logic group-by JavaScript giữ nguyên — chỉ là nguồn dữ liệu khác.

### Xác minh

**Type-check:**
```
$ npx tsc --noEmit
(no output — passed)
```

**Trực tiếp trên DB (mô phỏng đúng câu query mới + group-by mà React làm):**
```sql
WITH page_rows AS (
  SELECT creator_id, creator_name, gmv
  FROM video_with_metrics
  WHERE source_type = 'koc'
)
SELECT creator_name, COUNT(*) AS video_count, SUM(gmv) AS total_gmv
FROM page_rows
GROUP BY creator_id, creator_name
ORDER BY total_gmv DESC LIMIT 5;
```
Kết quả:
```
minhhai10112024     5 videos    764,513,066 ₫
duwn216            31 videos    701,594,119 ₫
anhlinh.emhuong    79 videos    413,093,837 ₫
mywanh_             1 video     249,544,812 ₫
phomaiquenef        3 videos    148,297,940 ₫
```
Trước fix: tất cả `0 ₫` (vì `videos.gmv` không còn được upload ghi vào). Sau fix: hiển thị đúng tổng doanh thu cộng dồn từ `video_period_metrics`. **PASS**

### Kết luận Lỗi 3
**Thành công.**
