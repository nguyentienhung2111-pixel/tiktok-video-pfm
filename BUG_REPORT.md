# Báo cáo Lỗi

## Trạng thái
ĐÃ SỬA CHỮA — Thành công

## Kết quả Kiểm thử (2026-05-15)

### Thay đổi đã áp dụng
- **Migration mới**: `supabase/migrations/fix_rpc_overload_drop_old_signatures.sql`
  - `DROP FUNCTION IF EXISTS get_videos_with_period_metrics(DATE, DATE, TEXT, UUID, NUMERIC, BIGINT, TEXT, TEXT, BOOLEAN, INT, INT, UUID[])` — xoá overload cũ (12 tham số).
  - `DROP FUNCTION IF EXISTS get_videos_summary_for_period(DATE, DATE, TEXT, UUID, NUMERIC, BIGINT, TEXT, UUID[])` — xoá overload cũ (8 tham số).
  - `CREATE OR REPLACE FUNCTION ...` — tạo lại 2 hàm với chữ ký mới (kèm `p_assigned_user_id`).
- Không sửa code frontend (TypeScript/React) — lỗi chỉ ở phía DB.

### Xác nhận signature DB sau migration (`pg_get_function_identity_arguments`)
- `get_videos_summary_for_period(p_period_start date, ..., p_tag_ids uuid[], p_assigned_user_id uuid)` — **chỉ còn 1 bản** ✅
- `get_videos_with_period_metrics(p_period_start date, ..., p_tag_ids uuid[], p_assigned_user_id uuid)` — **chỉ còn 1 bản** ✅

### Tái hiện & xác minh bằng test script (`scratch/test_rpc.mjs`, đăng nhập anon)

**Trước fix** (output gốc):
```
Summary Error: { code: 'PGRST203', message: 'Could not choose the best candidate function ...' }
Videos Error:  { code: 'PGRST203', message: 'Could not choose the best candidate function ...' }
```

**Sau fix** (output thực tế):
```
Testing get_videos_summary_for_period...
Summary Result: [
  { total_gmv: 4094189829, total_views: 27620683, total_orders: 41026,
    total_videos: 6439, total_creators: 2495 }
]

Testing get_videos_with_period_metrics...
Videos Count: 5
First Video ID: 7562787536624454929
Total Count from first row: 6439
```

### Kiểm tra thêm — bộ lọc staff vẫn hoạt động (`scratch/test_rpc_with_staff.mjs`)
```
--- summary WITHOUT staff filter ---
[ { total_videos: 6439, total_creators: 2495, total_gmv: 4094189829, ... } ]

--- summary WITH staff filter (076f1c17-...) ---
[ { total_videos: 6247, total_creators: 2462, total_gmv: 3905643285, ... } ]

--- list WITH staff filter (limit 3) ---
rows: 3   total_count: 6247   sample assigned_user_id: 076f1c17-36fc-422f-8b24-f8d038f5bf03
```

Kết luận: PGRST203 đã hết, cả hai nhánh (không filter / có filter staff) đều trả dữ liệu đúng. Push lên main để Vercel tự deploy.

## Tiêu đề Lỗi
Toàn bộ video không hiển thị do lỗi Ambiguous Function trong Supabase (Overloading).

## Mô tả Lỗi
Sau khi áp dụng tính năng lọc theo nhân viên, tất cả các trang Dashboard, Brand và KOC đều không hiển thị dữ liệu video. GMV và các chỉ số khác đều hiển thị bằng 0.

## Các bước tái hiện
1. Truy cập bất kỳ trang nào có hiển thị video (`dashboard`, `team/content`, `team/booking`).
2. Quan sát bảng video và các thẻ thống kê.
3. Kết quả: "Không tìm thấy video nào" và các số liệu bằng 0.

## Kết quả Thực tế vs Kết quả Mong đợi
- **Kết quả Thực tế**: Dữ liệu trống rỗng trên toàn hệ thống.
- **Kết quả Mong đợi**: Dữ liệu hiển thị bình thường như trước khi thêm bộ lọc.

## Ngữ cảnh & Môi trường
- Lỗi xảy ra sau khi chạy migration `add_assigned_user_filter_to_rpcs.sql`.
- Mã lỗi từ Supabase: `PGRST203` (Could not choose the best candidate function).

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)
Lỗi xảy ra do cơ chế **Function Overloading** của PostgreSQL. Khi thêm tham số `p_assigned_user_id` vào hàm RPC, migration đã tạo ra một hàm mới với signature khác thay vì thay thế hàm cũ.

**Sơ đồ lỗi:**
```
Client gọi rpc('get_videos_with_period_metrics', { params_without_staff })
       |
       v
Supabase (PostgREST) tìm trong DB thấy 2 hàm trùng tên:
   1. func(..., p_tag_ids UUID[])           <-- Cũ
   2. func(..., p_tag_ids UUID[], p_staff UUID) <-- Mới (có default NULL)
       |
       v
Lỗi: "Could not choose the best candidate function" (Ambiguity)
       |
       v
Frontend nhận error -> paginatedVideos = [] -> UI hiển thị "No data"
```

**Tại sao `CREATE OR REPLACE` không hoạt động?**
Trong Postgres, `CREATE OR REPLACE` chỉ thay thế hàm nếu danh sách tham số (số lượng và kiểu dữ liệu) khớp hoàn toàn. Việc thêm một tham số mới (ngay cả khi có default) tạo ra một hàm hoàn toàn mới.

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### Phương án: Drop hàm cũ và Recreate hàm mới (Khuyến nghị)
1. **Migration mới**: Tạo file migration thực hiện `DROP FUNCTION` các bản cũ của 2 hàm RPC trước khi tạo lại bản mới.
2. **SQL cụ thể**:
```sql
DROP FUNCTION IF EXISTS get_videos_with_period_metrics(DATE, DATE, TEXT, UUID, NUMERIC, BIGINT, TEXT, TEXT, BOOLEAN, INT, INT, UUID[]);
DROP FUNCTION IF EXISTS get_videos_summary_for_period(DATE, DATE, TEXT, UUID, NUMERIC, BIGINT, TEXT, UUID[]);
-- Sau đó chạy lại nội dung của add_assigned_user_filter_to_rpcs.sql
```

---

## Kế hoạch Xác minh
1. **Chạy script test**: Chạy lại `scratch/test_rpc.mjs` để đảm bảo Supabase không còn báo lỗi `PGRST203` và trả về đúng số lượng video.
2. **Kiểm tra UI**: Refresh Dashboard và trang KOC để xác nhận dữ liệu đã hiển thị trở lại.
