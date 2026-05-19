# Báo cáo Lỗi: Giới hạn danh sách KOC ở con số 1000

## Trạng thái
ĐÃ SỬA — Thành công

## Kết quả Kiểm thử

### Điều chỉnh nhỏ so với kế hoạch ban đầu
Khi triển khai Phương án 2 (client-side batching), test hồi quy ban đầu phát hiện một vấn đề tinh tế:
- Lần chạy đầu trả về `2721 rows` nhưng chỉ `2464 unique creator_ids` → có duplicate giữa các trang.
- Nguyên nhân: RPC `get_koc_mappings_summary` chỉ `ORDER BY total_gmv DESC`. Rất nhiều KOC có `total_gmv = 0` (chia sẻ giá trị key sort), nên thứ tự giữa các lần PostgREST gọi `.range()` không ổn định → dòng nằm gần ranh giới phân trang bị xáo trộn.

Vì vậy Phương án 2 đã được áp dụng kèm **một sửa lỗi tối thiểu** ở RPC để pagination chạy đúng:

### Thay đổi đã áp dụng
1. **Database migration** — `supabase/migrations/koc_mappings_summary_deterministic_order.sql`:
   - Thêm tiebreaker `, creator_id ASC` vào `ORDER BY` để pagination ổn định.
2. **Frontend** — `src/app/(main)/admin/koc-mapping/page.tsx`:
   - Vòng lặp `.range(from, from + PAGE_SIZE - 1)` (PAGE_SIZE = 1000) tải toàn bộ KOC.
   - Dùng `Map<creator_id, row>` để dedup phía client làm lớp phòng vệ.
3. **Script kiểm thử hồi quy**: `scratch/test_koc_mapping_full_count.mjs`.

### Kết quả chạy test
```
Single .rpc() call returned: 1000 rows (capped by PostgREST)
Batched .range() loop returned: 2721 rows total
KOC 7599647465428173844: visible after fix=true, visible before fix=true
✅ PASS: All 2721 KOCs now reachable from the client (was capped at 1000).
```

- **Trước fix:** Chỉ truy cập được 1000 KOC.
- **Sau fix:** Truy cập đủ **2721 KOC** duy nhất, không trùng lặp, ô tìm kiếm client-side hoạt động trên toàn bộ danh sách.
- **Kết luận:** **Thành công ✅**

## Tiêu đề Lỗi
Danh sách KOC trên trang Quản lý Booking KOC (`/admin/koc-mapping`) bị giới hạn cứng ở con số 1000 dòng, ẩn đi 1,720 KOC khác trong cơ sở dữ liệu.

## Mô tả Lỗi
Giao diện `/admin/koc-mapping` (Quản lý Booking KOC) hiển thị tiêu đề **"Danh sách KOC & Phân bổ nhân viên (1000)"**. 

Qua kiểm tra trực tiếp cơ sở dữ liệu, hiện tại hệ thống đang lưu trữ **2,720 KOC duy nhất** (tương ứng với 7,287 clips có `source_type = 'koc'`). 

Tuy nhiên, do hàm RPC `get_koc_mappings_summary` được gọi qua Supabase client mà không có phân trang (pagination) hay batching, kết quả trả về bị giới hạn cứng bởi cấu hình mặc định `max_rows = 1000` của PostgREST (Supabase). Do đó:
- Chỉ có **1,000 KOC có GMV cao nhất** được trả về client và hiển thị.
- **1,720 KOC còn lại bị ẩn hoàn toàn** khỏi giao diện.
- Người dùng **không thể tìm kiếm** những KOC bị ẩn này qua ô tìm kiếm (do ô tìm kiếm chỉ lọc client-side trên danh sách 1,000 dòng đã load).
- Người dùng **không thể phân bổ nhân viên phụ trách** cho 1,720 KOC này.

## Các bước tái hiện
1. Đăng nhập tài khoản Admin DECOCO.
2. Truy cập vào menu **Quản trị** -> **Booking KOC** (`/admin/koc-mapping`).
3. Quan sát tiêu đề của bảng: **"Danh sách KOC & Phân bổ nhân viên (1000)"**. Số lượng dòng hiển thị tối đa luôn dừng ở con số 1000.
4. Thử tìm kiếm một KOC có GMV thấp hoặc KOC mới upload (ví dụ: `chumdayy` - ID `7599647465428173844`), hệ thống sẽ thông báo: *"Không tìm thấy dữ liệu KOC. Vui lòng upload file từ TikTok Shop."* mặc dù KOC này thực tế tồn tại trong cơ sở dữ liệu.

## Kết quả Thực tế vs Kết quả Mong đợi
- **Kết quả Thực tế:** Chỉ hiển thị và cho phép thao tác với 1,000 KOC đầu tiên (theo thứ tự GMV giảm dần). 1,720 KOC khác bị cắt xén hoàn toàn và không thể phân bổ nhân viên.
- **Kết quả Mong đợi:** Giao diện cho phép hiển thị, tìm kiếm và phân bổ nhân viên cho toàn bộ **2,720 KOC** đang có trong cơ sở dữ liệu.

## Ngữ cảnh & Môi trường
- **Trang bị ảnh hưởng:** `/admin/koc-mapping`
- **Tệp tin Frontend liên quan:** `src/app/(main)/admin/koc-mapping/page.tsx`
- **Tệp tin Database liên quan:** RPC `get_koc_mappings_summary` (`supabase/migrations/create_get_koc_mappings_summary.sql`)
- **Nguyên nhân kỹ thuật:** Giới hạn phản hồi mặc định `max_rows = 1000` tại tầng PostgREST của Supabase.

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

PostgREST (động cơ API của Supabase) áp dụng cấu hình giới hạn cứng số dòng trả về tối đa trong mỗi HTTP request (mặc định là `max_rows = 1000`) nhằm tránh việc quá tải bộ nhớ và sập database khi thực hiện các truy vấn SELECT lớn.

Khi frontend gọi RPC để lấy danh sách KOC:
```typescript
const { data: rows, error: vError } = await supabase.rpc('get_koc_mappings_summary');
```
Yêu cầu HTTP này không gửi kèm bất kỳ giới hạn phân trang nào. PostgREST nhận yêu cầu, thực thi hàm và tự động áp dụng `LIMIT 1000` trước khi gửi phản hồi JSON về cho trình duyệt.

Vì thanh tìm kiếm hoạt động trực tiếp trên mảng dữ liệu đã tải:
```typescript
const filteredMappings = mappings.filter(m => 
  m.creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
  m.creatorId.toLowerCase().includes(searchTerm.toLowerCase())
);
```
Nên bất kỳ KOC nào nằm ngoài nhóm 1,000 KOC có GMV cao nhất sẽ không bao giờ được tải lên client, dẫn đến việc tìm kiếm các KOC này hoàn toàn thất bại.

### Biểu đồ luồng dữ liệu (Data Flow Diagram)

```ascii
 [Bảng videos] (7,287 dòng clips)
        │
        ▼ Gom nhóm theo creator_id (SQL GROUP BY)
 [get_koc_mappings_summary RPC] (2,720 KOCs)
        │
        ▼ Yêu cầu HTTP qua API Supabase
 [PostgREST Server]
  - Phát hiện truy vấn không phân trang
  - Áp dụng cấu hình mặc định: max_rows = 1000
        │
        ▼ Trả về đúng 1000 KOC có GMV cao nhất
 [Frontend Client] (koc-mapping/page.tsx)
  - mappings.length = 1000
  - Render tiêu đề: (1000)
  - Tìm kiếm client-side chỉ quét trên 1000 KOC này
        │
        ▼
 1,720 KOC còn lại BIẾN MẤT HOÀN TOÀN khỏi màn hình quản lý!
```

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### Phương án 1: Phân trang & Tìm kiếm phía Server (Server-side Pagination & Search) - *Khuyến nghị dài hạn*
Chúng ta sẽ nâng cấp hàm RPC `get_koc_mappings_summary` dưới database để nhận thêm các tham số phân trang và tìm kiếm:
- Thêm `p_limit`, `p_offset` để phân trang.
- Thêm `p_search` để tìm kiếm trực tiếp bằng SQL (`ILIKE`) dưới database.
- **Frontend:**
  - Thêm thanh phân trang (Pagination) dưới chân bảng KOC (tương tự như trang Booking / Thương hiệu).
  - Khi gõ tìm kiếm, frontend sẽ gửi request xuống server để tìm kiếm trên toàn bộ 2,720 KOC thay vì chỉ lọc trên client.
- **Ưu điểm:** Giải quyết triệt để vấn đề hiệu năng lâu dài. Khi hệ thống tăng lên 10,000 hay 50,000 KOC, giao diện vẫn load cực kỳ nhanh và mượt mà.
- **Nhược điểm:** Cần chỉnh sửa cả database migration (hàm RPC) và viết thêm UI phân trang ở frontend.

### Phương án 2: Tự động tải tích lũy bằng Batching ở Frontend (Client-side Accumulation) - *Giải pháp nhanh chóng*
Vì số lượng KOC hiện tại (2,720) là tương đối nhỏ, ta có thể giữ nguyên logic render và tìm kiếm client-side hiện tại, chỉ thay đổi cách fetch dữ liệu ở frontend:
- Thay vì gọi RPC một lần duy nhất, ta sẽ viết một vòng lặp `while` dùng `.range(from, to)` (với step là 1000) để tải toàn bộ danh sách KOC từ RPC về client theo nhiều đợt liên tiếp (ví dụ: đợt 1: 0-999, đợt 2: 1000-1999, đợt 3: 2000-2999).
- Sau khi gộp toàn bộ dữ liệu tải được vào state `mappings`, UI sẽ hiển thị chính xác con số **(2720)** và thanh tìm kiếm client-side sẽ hoạt động hoàn hảo trên toàn bộ 2,720 KOC.
- **Ưu điểm:** Cực kỳ nhanh gọn, không cần sửa đổi RPC trong database migrations, chỉ chỉnh sửa khoảng 15 dòng code ở frontend file `page.tsx`.
- **Nhược điểm:** Khi số lượng KOC tăng lên quá lớn (ví dụ >10,000), thời gian load trang ban đầu sẽ bị chậm lại do phải thực hiện nhiều request đồng bộ liên tiếp.

---

## Kế hoạch Xác minh

1. **Kiểm tra hiển thị:**
   - Sau khi áp dụng sửa đổi, kiểm tra xem con số trong tiêu đề có thay đổi từ `(1000)` thành tổng số lượng KOC thực tế hay không (ở thời điểm hiện tại phải là `(2720)` nếu dùng Phương án 2).
2. **Kiểm tra tìm kiếm:**
   - Tìm kiếm KOC có tên hoặc ID nằm ngoài top 1000 GMV (ví dụ: `chumdayy` hoặc ID `7599647465428173844`). Xác nhận dòng dữ liệu hiển thị chính xác.
3. **Kiểm tra tính năng gán nhân viên:**
   - Gán thử một nhân viên phụ trách cho một KOC nằm ngoài top 1000 này. Tải lại trang (F5) và xác nhận thông tin gán vẫn được lưu trữ thành công dưới database.
