# Báo cáo Lỗi
## Trạng thái
ĐÃ SỬA XONG

## Tiêu đề Lỗi
Thiếu cột "ID Video" trong bảng chi tiết video tại các trang Dashboard, Thương hiệu và KOC.

## Mô tả Lỗi
Hiện tại, bảng danh sách video tại 3 trang (Dashboard, Thương hiệu, KOC / Affiliate) chỉ hiển thị các cột: Video / Creator, Nguồn, GMV, Đơn hàng, Lượt xem, Tags và Action. Người dùng yêu cầu bổ sung cột "ID Video" vào vị trí thứ 3 (giữa cột Nguồn và cột GMV) để thuận tiện cho việc đối soát dữ liệu.

## Các bước tái hiện
1. Truy cập vào trang Dashboard.
2. Truy cập vào trang Thương hiệu.
3. Truy cập vào trang KOC / Affiliate.
4. Quan sát bảng "Chi tiết video".

## Kết quả Thực tế vs Kết quả Mong đợi
- **Kết quả Thực tế**: Bảng không có cột ID Video.
- **Kết quả Mong đợi**: Bảng có cột ID Video nằm giữa cột Nguồn và GMV.

## Ngữ cảnh & Môi trường
- File bị ảnh hưởng: `src/components/VideoTable.tsx`
- Các trang sử dụng: 
  - `src/app/(main)/dashboard/page.tsx`
  - `src/app/(main)/team/content/page.tsx`
  - `src/app/(main)/team/booking/page.tsx`
---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)
Lỗi này thực chất là một yêu cầu bổ sung tính năng (feature request) còn thiếu. 
- Component `VideoTable` dùng chung cho cả 3 trang chưa được định nghĩa cột "ID Video" trong phần `<TableHeader>` và `<TableBody>`.
- Dữ liệu `video_id` đã có sẵn trong interface `Video` (được trả về từ Supabase RPC `get_videos_with_period_metrics`).

Luồng dữ liệu:
```
Page (Dashboard/Brand/KOC) 
  -> fetchVideosWithMetrics (lib/queries.ts) 
    -> Supabase RPC (get_videos_with_period_metrics)
      -> Trả về VideoWithMetrics[] (có field video_id)
        -> Render VideoTable (components/VideoTable.tsx)
```

## Đề xuất Sửa lỗi (Proposed Fixes)
1. **Chỉnh sửa `src/components/VideoTable.tsx`**:
   - Thêm `<TableHead>` cho "ID Video" vào giữa "Nguồn" và "GMV".
   - Thêm `<TableCell>` hiển thị `video.video_id` vào đúng vị trí tương ứng.
   - (Tùy chọn) Hiển thị ID dưới dạng text copyable hoặc link trỏ đến TikTok video (nếu có thể xác định URL).

**Phương án khuyến nghị**: Hiển thị ID Video dưới dạng text màu xám nhạt, font monospace để dễ nhìn, và có thể thêm chức năng "Copy to clipboard" khi hover hoặc click.

## Kế hoạch Xác minh
1. Kiểm tra trực quan trên cả 3 trang để đảm bảo cột mới xuất hiện đúng vị trí và căn chỉnh đẹp.
2. Kiểm tra xem dữ liệu ID Video có hiển thị chính xác không (so khớp với dữ liệu gốc).
3. Đảm bảo layout bảng vẫn ổn định trên các màn hình khác nhau (responsive).

---

## Các thay đổi đã thực hiện
File: `src/components/VideoTable.tsx` (thay đổi tối thiểu, không refactor)
1. Thêm `<TableHead>` "ID Video" vào giữa cột "Nguồn" và "GMV".
2. Thêm `<TableCell>` hiển thị `video.video_id` dưới dạng text màu xám (`#94a3b8`), font monospace, kích thước nhỏ. Hiển thị `—` nếu không có ID.
3. Cho phép nhấn vào ID để sao chép vào clipboard (`navigator.clipboard.writeText`), kèm tooltip hướng dẫn.
4. Cập nhật `colSpan` của hàng "Không tìm thấy dữ liệu" từ `7` lên `8` để khớp số cột mới.

Vì `VideoTable` là component dùng chung, thay đổi này tự động áp dụng cho cả 3 trang Dashboard, Thương hiệu và KOC.

## Kết quả Kiểm thử: Thành công
- **Type-check** (`npx tsc --noEmit`): Pass, không có lỗi.
- **Lint** (`npx eslint src/components/VideoTable.tsx`): 0 errors. Chỉ còn 3 warnings có sẵn từ trước (`TagIcon`, `users`, `onAssign` không dùng) — không liên quan đến thay đổi này.
- Trường `video_id` đã được xác nhận tồn tại trong interface `Video` (`src/types/index.ts:25`) và `VideoWithMetrics extends Video`, nên dữ liệu luôn sẵn có để render.
