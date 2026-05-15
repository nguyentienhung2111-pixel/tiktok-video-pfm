# Báo cáo Lỗi

## Trạng thái
**ĐÃ SỬA CHỮA — THÀNH CÔNG**

## Phương án Lựa chọn
**Phương án 2 (Lọc theo Tag ID, JOIN với `video_tags`)** — theo lựa chọn của người dùng để đảm bảo nhất quán dữ liệu khi tên tag thay đổi.

## Kết quả Kiểm thử (Test Results)

Migration `add_tag_filter_to_rpcs` đã được apply trên Supabase project `mrmwwlqolqsoyuxasrta`. Chạy 4 test trực tiếp trên DB:

| # | Test | Output | Expected | Kết quả |
|---|------|--------|----------|---------|
| A | `get_videos_with_period_metrics()` không filter | `total_count = 7974` | baseline toàn bộ video | ✅ |
| B | Filter tag `Couple` (e56888e8…) | `total_count = 98` | = số bản ghi trong `video_tags` cho tag này (98) | ✅ |
| C | Filter tag `Couple` OR `Love` (logic OR) | `total_count = 111` | ≤ 98 + 108, có overlap | ✅ |
| D | `get_videos_summary_for_period()` filter `Couple` | `total_videos=98, total_gmv=70,356,573, total_views=1,089,240` | Aggregate chỉ trên 98 video Couple (baseline 7974 / 8.2B GMV) | ✅ |

**Kết luận: Bộ lọc tag hoạt động đúng ở cả 2 RPC (danh sách video và scorecard).**

## Các thay đổi đã thực hiện
- `supabase/migrations/add_tag_filter_to_rpcs.sql` (mới): thêm `p_tag_ids UUID[]` + `EXISTS (... video_tags ...)` cho cả 2 RPC. Drop overload cũ trước khi tạo lại.
- `src/lib/queries.ts`: thêm `tagIds?: string[]` vào `FetchVideosParams`, truyền `p_tag_ids` khi gọi RPC.
- `src/app/(main)/dashboard/page.tsx`, `src/app/(main)/team/content/page.tsx`, `src/app/(main)/team/booking/page.tsx`: thêm `tagIds: filters.tagIds` vào `baseParams`.

## Tiêu đề Lỗi
Bộ lọc "Theo Tag" trong Bộ lọc nâng cao không hoạt động trên toàn hệ thống.

## Mô tả Lỗi
Khi người dùng chọn các tag trong phần "Bộ lọc nâng cao" ở trang Dashboard, Thương hiệu, hoặc KOC / Affiliate, danh sách video và các con số tổng hợp (Scorecards) không thay đổi theo tag đã chọn. Hệ thống vẫn hiển thị dữ liệu của tất cả video như chưa lọc.

## Các bước tái hiện
1. Truy cập vào Dashboard, Thương hiệu hoặc KOC / Affiliate.
2. Nhấn vào nút "Bộ lọc nâng cao".
3. Chọn một hoặc nhiều Tag trong phần "Theo Tag".
4. Quan sát danh sách video và các chỉ số tổng hợp.
5. Kết quả: Dữ liệu không thay đổi.

## Kết quả Thực tế vs Kết quả Mong đợi
- **Kết quả Thực tế**: Hệ thống bỏ qua filter tag, trả về toàn bộ dữ liệu.
- **Kết quả Mong đợi**: Hệ thống chỉ hiển thị các video có chứa ít nhất một trong các tag đã chọn (hoặc tất cả, tùy logic thiết kế, nhưng hiện tại là không lọc gì).

## Ngữ cảnh & Môi trường
- File ảnh hưởng: `DashboardPage`, `ContentTeamPage`, `BookingTeamPage`, `queries.ts`, và các SQL RPC functions.
- Công nghệ: Next.js, Supabase (PostgreSQL), RPC functions.

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

Lỗi xảy ra do sự đứt gãy luồng dữ liệu từ UI đến Database qua 3 lớp:

1. **Lớp Giao diện (Frontend Pages)**: 
   - Trong hàm `fetchData` của cả 3 trang (`dashboard/page.tsx`, `team/content/page.tsx`, `team/booking/page.tsx`), biến `tagIds` từ state `filters` không được đưa vào đối tượng `baseParams`.
   - Vì vậy, khi gọi `fetchVideosSummary` và `fetchVideosWithMetrics`, thông tin về tag bị mất hoàn toàn.

2. **Lớp API (`src/lib/queries.ts`)**:
   - Interface `FetchVideosParams` và `FetchVideosSummaryParams` không định nghĩa thuộc tính `tagNames` hoặc `tagIds`.
   - Các hàm fetch không truyền tham số tag vào các lệnh gọi RPC của Supabase.

3. **Lớp Cơ sở dữ liệu (Supabase RPCs)**:
   - Các hàm SQL `get_videos_with_period_metrics` và `get_videos_summary_for_period` không có tham số đầu vào để lọc theo tag và không có logic `WHERE` cho cột `tags` trong bảng `videos`.

**Luồng dữ liệu lỗi:**
```ascii
[UI: FilterBar] --(tagIds)--> [Page State: filters]
                                     |
                                     X (Bị bỏ quên ở đây)
                                     |
[API: queries.ts] <---(thiếu)--- [baseParams]
       |
       X (Thiếu tham số trong RPC call)
       |
[DB: SQL Functions] <---(thiếu)--- [Supabase RPC]
```

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### Phương án 1: Lọc theo Tag Name (Khuyến nghị)
Vì bảng `videos` đã lưu sẵn mảng tên tag (`tags TEXT[]`), việc lọc theo tên sẽ nhanh và đơn giản nhất cho các hàm RPC hiện tại.

1. **SQL**: Cập nhật 2 hàm RPC để nhận thêm `p_tag_names TEXT[]` và thêm điều kiện:
   `AND (p_tag_names IS NULL OR v.tags && p_tag_names)` (Toán tử `&&` kiểm tra xem 2 mảng có phần tử chung không - logic OR).
2. **API**: Cập nhật `queries.ts` để nhận `tagNames: string[]` và truyền vào RPC.
3. **Frontend**: Trong các trang Dashboard/Brand/KOC, ánh xạ `tagIds` sang `tagNames` (sử dụng danh sách `allTags` có sẵn trong `FilterBar` hoặc fetch thêm) trước khi gọi API.

### Phương án 2: Lọc theo Tag ID (Phức tạp hơn)
Yêu cầu Join với bảng `video_tags` trong các hàm RPC. Điều này đảm bảo tính toàn vẹn dữ liệu tốt hơn nếu tên tag thay đổi, nhưng sẽ làm giảm hiệu năng của các hàm aggregate vốn đã phức tạp.

---

## Kế hoạch Xác minh

### Kiểm tra thủ công
1. Chọn 1 tag cụ thể (ví dụ: "Viral") cho 1 video duy nhất.
2. Sử dụng bộ lọc nâng cao chọn tag "Viral".
3. Xác nhận chỉ có video đó xuất hiện và các scorecard (GMV, Views) chỉ tính cho video đó.
4. Chọn 2 tag và xác nhận logic OR (hiển thị video có 1 trong 2 tag).
5. Xóa lọc và xác nhận dữ liệu quay về đầy đủ.

### Kiểm tra tự động (Nếu có)
- Viết integration test cho hàm `fetchVideosWithMetrics` với tham số `tagNames`.
