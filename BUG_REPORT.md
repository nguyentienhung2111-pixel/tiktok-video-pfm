# Báo cáo Lỗi

## Trạng thái
ĐÃ SỬA CHỮA — Thành công

## Kết quả Kiểm thử (2026-05-15)

### Thay đổi đã áp dụng
- **DB**: Migration `supabase/migrations/add_assigned_user_filter_to_rpcs.sql` — thêm tham số `p_assigned_user_id UUID DEFAULT NULL` vào cả hai RPC `get_videos_with_period_metrics` và `get_videos_summary_for_period`, áp dụng điều kiện `(p_assigned_user_id IS NULL OR v.assigned_user_id = p_assigned_user_id)` trong mệnh đề `WHERE`.
- **Queries**: `src/lib/queries.ts` — thêm `assignedUserId?: string` vào `FetchVideosParams`, truyền `p_assigned_user_id` xuống RPC khi có giá trị.
- **FilterBar**: `src/components/FilterBar.tsx` — thêm `staffId` vào `FilterState`; thêm prop `showStaffFilter` + `staffOptions`; render dropdown khi bật; tính vào `activeFilterCount`.
- **Trang KOC**: `src/app/(main)/team/booking/page.tsx` — bật `showStaffFilter`, truyền danh sách `users` đang load sẵn, đẩy `staffId` xuống RPC.
- **Trang khác** (`content`, `dashboard`): chỉ bổ sung `staffId: ''` vào `INITIAL_FILTERS` để khớp shape; **KHÔNG** hiển thị dropdown nhân viên (không hồi quy UI).

### Kết quả test trực tiếp Supabase SQL Editor (project `mrmwwlqolqsoyuxasrta`)
1. Test có bộ lọc — staff `076f1c17-36fc-422f-8b24-f8d038f5bf03`:
   - Đếm trực tiếp `videos` (source_type='koc', assigned_user_id=staff): **6247**
   - `get_videos_summary_for_period(... staff)` trả `total_videos`: **6247** ✅
   - `get_videos_with_period_metrics(... staff, limit 5000)` trả: **5000 hàng** (đúng theo giới hạn `limit`)
2. Test không bộ lọc (hồi quy):
   - Đếm trực tiếp `videos` (source_type='koc'): **6439**
   - `get_videos_summary_for_period(...)` không truyền staff: **6439** ✅ (không lệch so với trước)

### Kiểm tra Frontend
- `npx tsc --noEmit` chạy sạch, không lỗi typecheck.
- Sau khi commit, Vercel sẽ tự deploy preview/prod. Vận hành trên UI: vào trang KOC → Bộ lọc nâng cao → dropdown **Nhân viên phụ trách** xuất hiện, chọn → scorecards, Leaderboard và bảng video phải cập nhật.

## Tiêu đề Lỗi
Thiếu bộ lọc theo Nhân viên phụ trách trong Bộ lọc nâng cao tại trang KOC / Affiliate.

## Mô tả Lỗi
Hiện tại, người dùng không thể lọc danh sách video theo nhân viên đang phụ trách KOC. Mặc dù hệ thống đã có chức năng phân bổ KOC cho nhân viên (lưu vào cột `assigned_user_id` trong bảng `videos`), nhưng bộ lọc nâng cao (`FilterBar`) chưa hỗ trợ lọc theo tiêu chí này.

## Các bước tái hiện
1. Truy cập trang **KOC / Affiliate**.
2. Nhấn vào nút **Bộ lọc nâng cao**.
3. Quan sát các bộ lọc hiện có (Sản phẩm, Tag, GMV, Views).
4. Kết quả: Không thấy bộ lọc theo **Nhân viên phụ trách**.

## Kết quả Thực tế vs Kết quả Mong đợi
- **Kết quả Thực tế**: Chỉ có bộ lọc theo Sản phẩm, Tag, GMV và Views.
- **Kết quả Mong đợi**: Có thêm một dropdown để chọn Nhân viên phụ trách. Khi chọn, danh sách video và các con số thống kê (GMV, Đơn hàng, v.v.) phải cập nhật theo các video do nhân viên đó phụ trách.

## Ngữ cảnh & Môi trường
- Trang liên quan: `src/app/(main)/team/booking/page.tsx`
- Thành phần liên quan: `src/components/FilterBar.tsx`
- API liên quan: Các RPC function `get_videos_with_period_metrics` và `get_videos_summary_for_period`.

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)
1. **Dữ liệu**: Bảng `videos` đã có cột `assigned_user_id` và logic gán nhân viên cho KOC đã hoạt động (trong `src/app/(main)/admin/koc-mapping/page.tsx`).
2. **Backend (Supabase RPC)**: Các hàm SQL hiện tại (`get_videos_with_period_metrics` và `get_videos_summary_for_period`) chưa nhận tham số `p_assigned_user_id` nên không thể thực hiện lọc ở phía server.
3. **Frontend (API Layer)**: Interface `FetchVideosParams` trong `src/lib/queries.ts` thiếu trường `assignedUserId`.
4. **Frontend (UI)**: Thành phần `FilterBar.tsx` chưa có UI dropdown để chọn nhân viên và chưa quản lý state cho bộ lọc này.

**Luồng dữ liệu hiện tại:**
```
[UI FilterBar] --(FilterState)--> [BookingPage] --(params)--> [Queries.ts] --(RPC)--> [Supabase SQL]
      ^                                                                                    |
      |____________________________________________________________________________________|
```
*Vấn đề: Trường `assigned_user_id` bị đứt gãy ở mọi mắt xích trong luồng trên.*

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### Phương án 1: Cập nhật toàn diện (Khuyến nghị)
1. **Database**: Cập nhật 2 hàm RPC trong Supabase để hỗ trợ tham số `p_assigned_user_id`.
2. **Queries**: Thêm `assignedUserId` vào `FetchVideosParams` và truyền xuống RPC.
3. **FilterBar**:
    - Thêm `staffId` vào `FilterState`.
    - Thêm prop `showStaffFilter` để chỉ hiển thị bộ lọc này ở trang cần thiết.
    - Fetch danh sách nhân viên từ bảng `profiles` (hoặc nhận qua props).
4. **Booking Page**: Truyền `showStaffFilter={true}` vào `FilterBar` và xử lý state tương ứng.

---

## Kế hoạch Xác minh
1. **Kiểm tra Database**: Chạy câu lệnh SQL cập nhật RPC và test trực tiếp trong Supabase Editor với một `assigned_user_id` cụ thể.
2. **Kiểm tra Frontend**: 
    - Mở bộ lọc nâng cao trên trang KOC, chọn một nhân viên.
    - Kiểm tra xem payload gửi lên Supabase có chứa `p_assigned_user_id` không.
    - Xác nhận danh sách video và bảng Leaderboard chỉ hiển thị dữ liệu của nhân viên đó.
3. **Kiểm tra Hồi quy (Regression)**: Đảm bảo trang "Thương hiệu" và "Dashboard" vẫn hoạt động bình thường và không hiển thị bộ lọc nhân viên nếu không cần thiết.
