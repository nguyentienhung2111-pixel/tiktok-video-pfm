# Báo cáo Lỗi

## Trạng thái
ĐÃ SỬA — Thành công

## Kết quả Kiểm thử
- **Bản vá đã áp dụng:** `src/components/admin/UploadForm.tsx`
  - Bỏ `'tags'` khỏi `METADATA_FIELDS`.
  - Bỏ `tags: [],` khỏi đối tượng khởi tạo `metadata` trong `mapRow`.
- **Script kiểm thử hồi quy:** `scratch/test_upsert_preserves_tags.mjs`
  - Chọn 1 video có tag thật trong DB (`video_id=7631849777805790471`, tags `["Couple","Love","duong"]`).
  - Thực hiện `upsert` đúng kiểu payload mới (KHÔNG kèm trường `tags`).
  - Đọc lại cột `tags` sau upsert và so sánh.
- **Kết quả:** **Thành công ✅**
  ```
  Target video_id=7631849777805790471, original tags=["Couple","Love","duong"]
  After upsert tags=["Couple","Love","duong"]
  ✅ PASS: Upsert without `tags` field preserves existing tags column.
  ```
- **Kết luận:** Khi `tags` không có trong payload của `upsert`, Postgres giữ nguyên giá trị cũ trong cột `videos.tags`. Lỗi ghi đè đã được loại bỏ tận gốc, không cần thay đổi RPC hay schema.

## Tiêu đề Lỗi
Các tag đã gắn trong Trang Thương hiệu và Trang KOC / Affiliate không hiển thị trên web, mặc dù bộ lọc vẫn lọc được.

## Mô tả Lỗi
Các tag (như `Couple`, `Love`, `triet`,...) được gắn cho video ở trang Thương hiệu (Brand) hoặc KOC / Affiliate không còn hiển thị (luôn hiển thị "No tags") trên giao diện web, mặc dù người dùng vẫn có thể chọn tag trong bộ lọc nâng cao để lọc danh sách video bình thường.

## Các bước tái hiện
1. Truy cập trang Thương hiệu (`/team/content`) hoặc trang KOC / Affiliate (`/team/booking`).
2. Quan sát cột "Tags" trong bảng danh sách video. Tất cả các video đều hiển thị "No tags" (hoặc không có badge tag nào hiển thị).
3. Sử dụng bộ lọc nâng cao (FilterBar), chọn một tag (ví dụ: "Couple") và áp dụng bộ lọc.
4. Danh sách video được lọc chính xác các video có tag đó, chứng tỏ bộ lọc vẫn hoạt động, nhưng các badge tag trên dòng video vẫn hiển thị "No tags".

## Kết quả Thực tế vs Kết quả Mong đợi
- **Kết quả Thực tế:** Cột "Tags" của các dòng video luôn hiển thị "No tags" mặc dù trong database các video này thực sự có tag và bộ lọc vẫn tìm ra.
- **Kết quả Mong đợi:** Các tag đã gắn hiển thị đầy đủ trên giao diện của từng video trong bảng.

## Ngữ cảnh & Môi trường
- **Trang bị ảnh hưởng**: `/team/content` (Thương hiệu), `/team/booking` (KOC / Affiliate)
- **Thành phần giao diện**: `<VideoTable>` (`src/components/VideoTable.tsx`)
- **Tệp tin liên quan**: 
  - `src/components/admin/UploadForm.tsx` (Logic upload Excel)
  - `src/components/TagDialog.tsx` (Logic gắn tag)

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

Khi người dùng gắn tag cho video, hệ thống thực hiện hai bước lưu trữ song song để tối ưu hóa hiệu năng:
1. Lưu liên kết tag vào bảng trung gian `video_tags` (lưu `video_id` và `tag_id`). Đây là bảng được dùng để thực hiện chức năng **lọc video theo tag**.
2. Lưu danh sách tên các tag vào mảng `tags TEXT[]` trực tiếp trên bảng `videos` để frontend hiển thị nhanh mà không cần JOIN (denormalized data).

**Nguyên nhân gây ra lỗi:**
Trong tệp `src/components/admin/UploadForm.tsx`, mỗi khi người dùng upload file báo cáo Excel (cả Brand lẫn KOC/Affiliate), hàm `mapRow` được gọi để chuẩn bị payload upsert vào bảng `videos`.
Trong hàm `mapRow` (`src/components/admin/UploadForm.tsx:L230`):
```typescript
  const metadata: Record<string, unknown> = {
    source_type: sourceType,
    product_id: null,
    tags: [], // <--- RESET tags thành mảng rỗng
    raw_data: row,
  };
```
Khi thực hiện lệnh `supabase.from('videos').upsert(batch, { onConflict: 'video_id' })`, vì trong payload của mỗi dòng video đều có chứa trường `tags: []`, Supabase/PostgREST sẽ thực hiện cập nhật đè (overwrite) cột `tags` trong bảng `videos` thành `[]` (mảng rỗng) đối với tất cả các video bị trùng `video_id`.

Tuy nhiên, bảng trung gian `video_tags` không hề bị ảnh hưởng bởi quá trình upload này. Do đó:
- Chức năng lọc (sử dụng bảng `video_tags` qua RPC) vẫn hoạt động bình thường.
- Chức năng hiển thị (sử dụng cột `videos.tags` qua trường `video.tags` trả về từ RPC) bị mất hoàn toàn, hiển thị "No tags".

```ascii
[Upload Báo Cáo Excel]
      │
      ▼
Gọi upsert vào `videos` với `tags: []` (Do mapRow gán mặc định)
      │
      ├───────────────────────┐
      ▼                       ▼
[Bảng `videos`]          [Bảng `video_tags` (Junction)]
`tags` bị ghi đè thành []     Không bị ảnh hưởng (Vẫn giữ các tag_id)
      │                       │
      ▼                       ▼
[Hiển thị Web]           [Bộ lọc nâng cao]
Đọc `video.tags`         Tìm theo `video_tags`
=> Báo "No tags"         => Vẫn lọc chính xác!
```

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### Phương án 1: Loại bỏ trường `tags` khỏi payload upsert khi upload (Khuyến nghị)
Trong tệp `src/components/admin/UploadForm.tsx`:
1. Loại bỏ `'tags'` khỏi hằng số `METADATA_FIELDS` (`L119`) để không tự động trích xuất hay cập nhật cột này từ Excel.
2. Xóa dòng `tags: [],` khỏi đối tượng khởi tạo `metadata` trong hàm `mapRow` (`L230`).

**Tại sao đây là phương án tối ưu?**
- Khi thực hiện `upsert` trên Supabase/Postgres, nếu một cột không được định nghĩa trong payload được gửi lên, Postgres sẽ giữ nguyên giá trị cũ của cột đó đối với các dòng bị trùng khóa (`ON CONFLICT DO UPDATE`).
- Tránh ghi đè và làm mất dữ liệu tag hiện tại của video mỗi lần import file Excel mới.
- Vừa đơn giản, vừa tối ưu hiệu năng và kế thừa đúng kiến trúc thiết kế.

### Phương án 2: Tổng hợp động danh sách tag từ DB trong RPC `get_videos_with_period_metrics`
Chúng ta có thể thay đổi RPC `get_videos_with_period_metrics` dưới database để nó tự động thực hiện `LEFT JOIN` với `video_tags` và `tags` rồi dùng `array_agg(t.name)` để trả về trường `tags`.
**Nhược điểm:** Làm câu query RPC phức tạp hơn và có thể ảnh hưởng nhỏ đến hiệu năng khi số lượng video tăng cao, trong khi cột `videos.tags` đã được thiết kế sẵn để lưu trữ cache cho mục đích hiển thị nhanh.

---

## Kế hoạch Xác minh
1. **Khôi phục dữ liệu đã mất (Đã thực hiện):** Chạy một script JavaScript đồng bộ để khôi phục lại cột `tags` trong bảng `videos` từ dữ liệu của bảng `video_tags`. (Chúng tôi đã chạy thành công `scratch/sync_tags.mjs`, khôi phục tags cho **268 videos** thành công!).
2. **Kiểm tra hiển thị:** Tải lại trang Thương hiệu và KOC / Affiliate để xác nhận các badge tag đã hiển thị trở lại.
3. **Áp dụng bản vá:** Sửa đổi `src/components/admin/UploadForm.tsx` theo Phương án 1.
4. **Kiểm tra chống ghi đè:** Thử upload lại một file báo cáo Excel và xác nhận rằng các video đã gắn tag trước đó không bị mất tag.
