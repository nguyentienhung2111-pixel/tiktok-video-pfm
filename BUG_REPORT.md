# Báo cáo Lỗi

## Trạng thái
ĐÃ SỬA CHỮA — Thành công

## Kết quả Kiểm thử (2026-05-15)

### Thay đổi đã áp dụng — Phương án 1 (lọc tại Page Component)
- `src/app/(main)/team/booking/page.tsx`:
  - Thêm `useMemo` mới:
    ```ts
    const bookingStaff = useMemo(
      () => users.filter(u => u.role === 'staff_booking' || u.role === 'leader_booking'),
      [users]
    );
    ```
  - Đổi `staffOptions={users}` → `staffOptions={bookingStaff}`.
- Không đụng tới fetch `profiles` → Leaderboard "TOP Nhân viên Booking" (đang lookup theo `assigned_user_id` qua `users`) vẫn hoạt động bình thường.
- **Loại bỏ `admin`** khỏi danh sách: xác thực bằng query DB cho thấy không có video KOC nào được gán cho role `admin` (KOC chỉ gán cho `leader_booking` 6247 video + `staff_booking` 192 video).

### Kiểm thử
- TypeScript: `npx tsc --noEmit` chạy sạch.
- Script tái hiện luồng dữ liệu của page (`scratch/test_booking_staff_filter.mjs`):

```
Profiles BEFORE filter (count by role): {
  admin: 1,
  leader_booking: 1,
  staff_booking: 3,
  leader_content: 1,
  staff_content: 6
}
Dropdown AFTER filter (count by role): { leader_booking: 1, staff_booking: 3 }
PASS: dropdown has 4 entries, all in {staff_booking, leader_booking}.
```

Kết quả: dropdown từ 12 nhân viên active → còn 4 nhân viên team Booking (1 leader + 3 staff). Admin & toàn bộ team Content đã bị loại. Leaderboard và bảng video không thay đổi.

## Tiêu đề Lỗi
Bộ lọc Nhân viên hiển thị tất cả nhân viên thay vì chỉ team Booking tại trang KOC.

## Mô tả Lỗi
Hiện tại, dropdown "Nhân viên phụ trách" trong Bộ lọc nâng cao tại trang KOC / Affiliate đang liệt kê toàn bộ nhân viên có trong hệ thống (bao gồm cả team Content và Admin). Điều này gây khó khăn cho việc tìm kiếm và chọn đúng nhân viên thuộc team Booking để lọc dữ liệu.

## Các bước tái hiện
1. Truy cập trang **KOC / Affiliate**.
2. Nhấn vào nút **Bộ lọc nâng cao**.
3. Mở dropdown **Nhân viên phụ trách**.
4. Quan sát danh sách nhân viên: Thấy cả nhân viên có hậu tố "CONTENT" hoặc thuộc team Content.

## Kết quả Thực tế vs Kết quả Mong đợi
- **Kết quả Thực tế**: Danh sách hiển thị tất cả các `profiles` có `is_active = true`.
- **Kết quả Mong đợi**: Danh sách chỉ hiển thị các nhân viên thuộc team Booking (các role `staff_booking` và `leader_booking`).

## Ngữ cảnh & Môi trường
- File ảnh hưởng: `src/app/(main)/team/booking/page.tsx`.
- Dữ liệu: Bảng `profiles` trong Supabase.

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)
Trong file `src/app/(main)/team/booking/page.tsx`, câu lệnh fetch dữ liệu người dùng đang lấy toàn bộ profile mà không lọc theo role:

```typescript
// src/app/(main)/team/booking/page.tsx:85
supabase.from('profiles').select('*').eq('is_active', true)
```

Sau đó, kết quả này được truyền trực tiếp vào component `FilterBar`:

```typescript
// src/app/(main)/team/booking/page.tsx:209
staffOptions={users}
```

Do đó, bất kỳ user nào đang hoạt động đều xuất hiện trong danh sách lọc.

## Đề xuất Sửa lỗi (Proposed Fixes)

### Phương án 1: Lọc tại Page Component (Khuyến nghị)
Thay đổi cách truyền `staffOptions` vào `FilterBar` bằng cách lọc mảng `users` dựa trên role.

```typescript
// Trong BookingTeamPage
const bookingStaff = useMemo(() => 
  users.filter(u => u.role === 'staff_booking' || u.role === 'leader_booking' || u.role === 'admin'),
  [users]
);

// ... sau đó truyền bookingStaff vào FilterBar
```
*Lưu ý: Có nên bao gồm `admin` không? Tùy thuộc vào việc Admin có trực tiếp phụ trách KOC nào không. Dựa trên yêu cầu "chỉ hiện nhân viên team Booking", có thể loại bỏ `admin`.*

### Phương án 2: Lọc ngay khi Fetch từ Database
Cập nhật câu lệnh Supabase để chỉ lấy các user thuộc team Booking. Cách này tối ưu hơn về băng thông nhưng có thể ảnh hưởng đến các logic khác nếu `users` được dùng cho mục đích khác trong cùng page (hiện tại `users` được dùng cho Leaderboard, nên nếu lọc ở đây thì Leaderboard cũng sẽ chỉ hiện team Booking - điều này thực tế là hợp lý cho trang này).

## Kế hoạch Xác minh
1. Kiểm tra dropdown Nhân viên tại trang KOC: Đảm bảo không còn nhân viên team Content.
2. Kiểm tra Leaderboard "TOP Nhân viên Booking": Đảm bảo vẫn hiển thị đúng các nhân viên team Booking có hiệu suất cao.
3. Kiểm tra trang Thương hiệu (Brand): Đảm bảo không bị ảnh hưởng (hoặc nếu cần cũng áp dụng filter tương tự cho team Content).
