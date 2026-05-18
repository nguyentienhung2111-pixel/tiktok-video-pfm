# Báo cáo Lỗi

## Trạng thái
ĐÃ SỬA CHỮA — THÀNH CÔNG (2026-05-18)

## Tiêu đề Lỗi
1. Nút "Xoá lần upload gần nhất" không phân biệt tab Thương hiệu (Brand) hay KOC / Affiliate.
2. Thanh tìm kiếm không hoạt động khi tìm theo ID hoặc tên của KOC (Creator).

## Mô tả Lỗi
**Lỗi 1:** Trên trang Upload, khi người dùng đang ở tab "Thương hiệu" và bấm "Xoá lần upload gần nhất", hệ thống lại hiển thị và sẽ xoá file upload gần nhất của toàn hệ thống (có thể là file KOC) thay vì file Brand gần nhất. Lỗi tương tự khi ở tab "KOC / Affiliate".
**Lỗi 2:** Thanh tìm kiếm (FilterBar) có placeholder là "Tìm theo creator hoặc tiêu đề video...", nhưng khi nhập các ID tài khoản KOC có thực trong dữ liệu (như `thyneeee_`, `metnamnam`, `linhxuanxinh`), hệ thống không trả về kết quả nào.

## Các bước tái hiện
**Lỗi 1:**
1. Vào trang "Upload dữ liệu".
2. Upload một file vào tab "KOC / Affiliate".
3. Chuyển sang tab "Thương hiệu (Brand)".
4. Xem thông báo ở phần "Xoá lần upload gần nhất", nhận thấy hệ thống hiển thị thông tin của file KOC vừa upload (file chung gần nhất) thay vì file Brand gần nhất.
5. Bấm xoá sẽ làm mất dữ liệu KOC dù đang ở tab Thương hiệu.

**Lỗi 2:**
1. Vào trang Dashboard hoặc KOC/Affiliate.
2. Ở thanh tìm kiếm "Tìm theo creator hoặc tiêu đề video...", nhập ID creator (ví dụ: `thyneeee_`).
3. Danh sách hiển thị "Không tìm thấy video nào" dù dữ liệu thực tế có tồn tại KOC này.

## Kết quả Thực tế vs Kết quả Mong đợi
- **Lỗi 1 Thực tế:** Nút xoá luôn lấy file upload gần nhất bất kể tab hiện tại.
- **Lỗi 1 Mong đợi:** Nút xoá ở tab nào thì chỉ thao tác trên file upload gần nhất của tab đó (dựa vào `source_type`).
- **Lỗi 2 Thực tế:** Không tìm ra video khi search theo ID/Tên Creator.
- **Lỗi 2 Mong đợi:** Search trả về đúng các video của Creator ID hoặc Tên tương ứng.

## Ngữ cảnh & Môi trường
- Trang: `/admin/upload`, `/dashboard`
- Component: `DeleteLastUploadButton.tsx`, `UploadForm.tsx`, `FilterBar.tsx`
- Database RPC: `get_videos_with_period_metrics`, `get_videos_summary_for_period`

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

### Lỗi 1: Xoá sai lần upload theo tab
Trong file `src/app/(main)/admin/upload/page.tsx`, component `UploadForm` và `DeleteLastUploadButton` được render thành các block hoàn toàn độc lập với nhau.
State `sourceType` (để phân biệt đang ở tab Brand hay KOC) được khai báo và quản lý nội bộ bên trong `UploadForm.tsx`.
Do đó, `DeleteLastUploadButton.tsx` không hề biết người dùng đang chọn tab nào, nó gọi API lấy lịch sử mới nhất mà không lọc theo `source_type`:
```javascript
// src/components/admin/DeleteLastUploadButton.tsx
const { data, error } = await supabase
  .from('upload_history')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(1)
```

```ascii
[UploadPage]
 ├── [UploadForm] ------------> Quản lý state: sourceType ('brand' / 'koc')
 │
 └── [DeleteLastUploadButton] -> Không biết sourceType! Lấy file mới nhất toàn hệ thống.
```

### Lỗi 2: Tìm kiếm không ra Creator
Thanh tìm kiếm (`FilterBar.tsx`) truyền giá trị `filters.search` tới cơ sở dữ liệu thông qua tham số `p_search` của 2 hàm RPC trên Supabase (`get_videos_with_period_metrics` và `get_videos_summary_for_period`).
Tuy nhiên, khi xem mã nguồn SQL (ví dụ trong migration mới nhất `add_assigned_user_filter_to_rpcs.sql`), logic lọc tìm kiếm chỉ quét duy nhất cột `video_title`:
```sql
-- Trong logic của hàm RPC:
AND (p_search IS NULL OR v.video_title ILIKE '%' || p_search || '%')
```
Hậu quả là dù UI có ghi "Tìm theo creator...", hệ thống thực chất đã bỏ qua không tìm kiếm trong các cột `creator_name` hay `creator_id`.

## Đề xuất Sửa lỗi (Proposed Fixes)

### Lỗi 1
- **Phương án 1 (Khuyến nghị):** "Lift state up" - Đưa state `sourceType` từ `UploadForm` lên component cha là `UploadPage`. Sau đó truyền `sourceType` xuống dưới dạng props cho cả `UploadForm` và `DeleteLastUploadButton`. Trong `DeleteLastUploadButton`, cập nhật câu query thêm `.eq('source_type', sourceType)`.
- **Phương án 2:** Sử dụng React Context hoặc Zustand để quản lý global state cho trang Upload (hơi dư thừa cho một trang nhỏ).

### Lỗi 2
- **Phương án 1 (Khuyến nghị):** Tạo một file migration SQL mới để cập nhật (CREATE OR REPLACE) 2 hàm RPC `get_videos_with_period_metrics` và `get_videos_summary_for_period`. Cập nhật mệnh đề WHERE để `p_search` quét cả `creator_name` và `creator_id`:
```sql
AND (
  p_search IS NULL OR 
  v.video_title ILIKE '%' || p_search || '%' OR
  v.creator_name ILIKE '%' || p_search || '%' OR
  v.creator_id ILIKE '%' || p_search || '%'
)
```

## Kế hoạch Xác minh
1. **Lỗi 1:** Mở trang Upload, chọn tab "Thương hiệu". Component xoá phải báo đúng tên file Brand gần nhất. Đổi sang tab KOC, component phải lập tức cập nhật hiện tên file KOC gần nhất. 
2. **Lỗi 2:** Chạy script migration SQL mới. Mở thanh tìm kiếm trên web, gõ các ID `thyneeee_`, `metnamnam`, `linhxuanxinh` và xác nhận video của các KOC này đã hiện ra chính xác.

---

## Kết quả Sửa chữa & Xác minh (2026-05-18)

### Các thay đổi đã áp dụng
- `src/app/(main)/admin/upload/page.tsx`: Nâng state `sourceType` lên `UploadPage` và truyền xuống cả `UploadForm` và `DeleteLastUploadButton`.
- `src/components/admin/UploadForm.tsx`: Chuyển `UploadForm` thành controlled component nhận `sourceType` + `onSourceTypeChange` qua props (giữ nguyên toàn bộ logic upload).
- `src/components/admin/DeleteLastUploadButton.tsx`: Nhận `sourceType` prop, thêm `.eq('source_type', sourceType)` vào câu query, và re-fetch khi đổi tab. Header hiển thị rõ tab đang chọn.
- `supabase/migrations/add_creator_search_to_rpcs.sql` (mới): `CREATE OR REPLACE` hai hàm `get_videos_with_period_metrics` và `get_videos_summary_for_period` để `p_search` quét cả `video_title`, `creator_name`, và `creator_id`.

### Xác minh

**Type-check & Lint (chỉ tính lỗi mới):**
```
$ npx tsc --noEmit
(no output — passed)

$ npx eslint <changed files>
→ 3 lỗi `any` + 1 warning đều là code cũ, KHÔNG do bản fix tạo ra.
```

**Lỗi 1 — Tách lần upload gần nhất theo tab (chạy trên DB thật):**
```sql
SELECT 'brand latest', file_name, created_at FROM upload_history
WHERE source_type='brand' ORDER BY created_at DESC LIMIT 1;
-- → TikTok_Upload_Template_Brand_11.05.26_17.05.26.xlsx | 2026-05-18 04:51:27 UTC

SELECT 'koc latest',   file_name, created_at FROM upload_history
WHERE source_type='koc'   ORDER BY created_at DESC LIMIT 1;
-- → TikTok_Upload_Template_Aff_11.05.26_17.05.26.xlsx  | 2026-05-18 10:22:18 UTC

SELECT 'overall',      file_name, created_at FROM upload_history
ORDER BY created_at DESC LIMIT 1;
-- → TikTok_Upload_Template_Aff_11.05.26_17.05.26.xlsx  | 2026-05-18 10:22:18 UTC  ← BUG cũ trả về cái này cho cả 2 tab
```
Kết quả: với `sourceType='brand'`, câu query trả về đúng file Brand chứ không còn lấy file KOC mới hơn. **PASS**

**Lỗi 2 — RPC quét creator_name / creator_id (chạy sau migration):**
```sql
SELECT 'thyneeee_'    , COUNT(*) FROM get_videos_with_period_metrics(p_search => 'thyneeee_'   , p_limit => 100); -- 4
SELECT 'metnamnam'    , COUNT(*) FROM get_videos_with_period_metrics(p_search => 'metnamnam'   , p_limit => 100); -- 1
SELECT 'linhxuanxinh' , COUNT(*) FROM get_videos_with_period_metrics(p_search => 'linhxuanxinh', p_limit => 100); -- 1
SELECT 'NULL'         , COUNT(*) FROM get_videos_with_period_metrics(p_search => NULL          , p_limit => 100); -- 100

SELECT total_videos, total_creators, total_gmv
FROM get_videos_summary_for_period(p_search => 'thyneeee_');
-- → total_videos=4, total_creators=1, total_gmv=2316885
```
Trước fix: cả 3 query trả 0 dòng (vì chỉ scan `video_title`). Sau fix: trả đúng số video thực tế của từng creator. **PASS**

### Kết luận
**Thành công** — Cả 2 lỗi đã được sửa, xác minh trực tiếp trên DB Supabase (`mrmwwlqolqsoyuxasrta`).
