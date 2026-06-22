# Báo cáo Lỗi: Lệch số liệu GMV TikTok sau khi Upload dữ liệu

## Trạng thái
**Thành công** — Đã sửa lỗi phía Client, kiểm thử PASS và type-check sạch (xem mục "Kết quả Kiểm thử & Xác minh").

> Lịch sử trạng thái: `MỚI` → `ĐANG SỬA CHỮA` → `THÀNH CÔNG`.

### Nhận xét review kế hoạch
Kế hoạch (Đề xuất Sửa lỗi) **ổn** cho yêu cầu "thay đổi tối thiểu": lọc dữ liệu kênh chính chủ Brand khỏi luồng upload KOC giải quyết triệt để triệu chứng (đếm trùng / ghi đè chéo Brand ↔ KOC) mà không động đến RLS hay API.

**Hạn chế đã biết (không chặn fix, ghi nhận để cải thiện sau):**
- `BRAND_CREATORS` được hard-code — khi Brand mở thêm kênh chính chủ mới phải cập nhật lại danh sách trong code. Hướng cải thiện tương lai: đánh dấu kênh Brand bằng một cờ trong DB (vd. bảng `creators`/`videos`) thay vì danh sách cứng.
- Bộ lọc khớp theo `creator_name` (sau khi `lowercase`/`trim`) nên phụ thuộc việc file KOC dùng đúng handle kênh.

## Tiêu đề Lỗi
Số liệu GMV Thương hiệu (Brand) tăng lệch (tăng tạm thời trước khi upload file Brand) và chênh lệch không khớp sau khi upload do file Affiliate/KOC chứa dữ liệu của kênh chính chủ Brand và ghi đè chéo metrics.

## Mô tả Lỗi
Khi người dùng thực hiện upload file dữ liệu của kỳ báo cáo `15/06/2026 - 21/06/2026`:
- **Số liệu trước khi upload file Brand** (sau khi upload file KOC): **5.241.744.274 ₫** (đã bị tăng sẵn 117.358.453 ₫ từ file KOC).
- **Số liệu sau khi upload file Brand**: **5.245.248.002 ₫**.
- **Chênh lệch thực tế tăng thêm**: Chỉ tăng **3.503.728 ₫** (trong khi file Brand có GMV thực tế là **120.862.181 ₫**).

Sự không khớp này gây hiểu lầm cho người dùng rằng hệ thống bị mất dữ liệu hoặc tính toán sai.

---

## Các bước tái hiện
1. Vào trang **Upload dữ liệu**.
2. Chọn kỳ báo cáo `15/06/2026 - 21/06/2026`.
3. Chọn tab **KOC / Affiliate** và upload file KOC (`TikTok_Upload_Template_Aff_15.06.26_21.06.26.xlsx`).
4. Xem Dashboard trang **Thương hiệu**: GMV Thương hiệu bị tăng sẵn **117.358.453 ₫** dù chưa upload file Brand.
5. Quay lại trang Upload, chọn tab **Thương hiệu** và upload file Brand (`TikTok_Upload_Template_Brand_15.06.26_21.06.26.xlsx`).
6. GMV Thương hiệu chỉ tăng thêm **3.503.728 ₫** (chênh lệch giữa 120.862.181 ₫ và 117.358.453 ₫).

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

1. **Dữ liệu chồng chéo trong file TikTok**:
   - File Affiliate (KOC) xuất từ TikTok Seller Center ghi nhận toàn bộ doanh thu affiliate, bao gồm cả doanh thu của các video thuộc **kênh chính chủ Brand** (như `decoco.accessories` và `decoco.xinchao`) được bán qua hình thức affiliate.
   - Trong file KOC kỳ này có **1.316 dòng video Brand** với tổng GMV là **117.358.453 ₫**.

2. **Ghi đè chéo ở database**:
   - Khi upload file KOC, hệ thống parse và upsert metrics của tất cả video trong file vào bảng `video_period_metrics`.
   - Do 1.316 video này liên kết với bảng `videos` (nơi chúng được định nghĩa là `brand`), hệ thống tính GMV của chúng vào GMV Brand, khiến số liệu Brand bị tăng sớm.
   - Khi upload file Brand sau đó, câu lệnh `upsert` trên bảng `video_period_metrics` ghi đè (overwrite) metrics của 1.316 video này bằng dữ liệu của file Brand (với GMV chính thức), và thêm mới 34 video còn lại (GMV 3.503.728 ₫).
   - Tổng GMV Brand cuối cùng là chính xác (**120.862.181 ₫**), nhưng quá trình tăng số dư bị lệch và nếu upload KOC sau Brand, dữ liệu Brand sẽ bị ghi đè sai lệch bởi dữ liệu KOC.

---

## Giải pháp đã triển khai (Implemented Fix)

Chúng ta thực hiện **lọc dữ liệu phía Client** khi người dùng thực hiện upload ở tab KOC/Affiliate:

1. **Định nghĩa danh sách Brand Creators chính chủ**:
   ```typescript
   export const BRAND_CREATORS = [
     'decoco.accessories',
     'decoco.xinchao',
     'tienthoitrend',
     'quanhdanhgia_9x',
     'thosandealhoi',
     'reviewphukien',
   ];
   ```

2. **Lọc dữ liệu trước khi nạp vào DB trong `UploadForm.tsx`**:
   - Khi `sourceType === 'koc'`, loại bỏ toàn bộ các dòng thuộc `BRAND_CREATORS` khỏi danh sách upsert.
   - Hiển thị phản hồi chi tiết cho người dùng trên giao diện về số lượng dòng Brand đã bị bỏ qua:
     `[Đã lọc bỏ X dòng thuộc kênh Brand]`.

---

## Kết quả Kiểm thử & Xác minh

1. **Mock Test (`scratch/test_koc_filter.js`)** — **PASS**:
   - Khai báo mảng mock chứa cả creator Brand và KOC (bao gồm cả trường hợp viết hoa/thường, khoảng trắng dư thừa).
   - Lệnh: `node scratch/test_koc_filter.js`
   - Output (chạy lại ngày 2026-06-22):
     ```
     === Testing KOC Upload Filtering Logic ===
     Original rows count: 6
     Filtered rows count: 2
     Skipped brand rows count: 4
     ✅ PASS: Brand creators correctly filtered out under 'koc' upload!
     ```
   - Logic lọc hoạt động chính xác: 4 dòng Brand bị loại, 2 dòng KOC được giữ.

2. **Type-check** — **PASS**:
   - Lệnh: `npx tsc --noEmit -p tsconfig.json`
   - Kết quả: exit code `0` (không có lỗi type, bản sửa không phá vỡ build).

3. **Bảo vệ RLS & Tính toàn vẹn**:
   - Thay đổi hoàn toàn độc lập ở phía Client (lọc mảng trước khi ghi vào DB), không ảnh hưởng đến RLS policies hay cấu trúc API.
   - Loại bỏ triệt để rủi ro ghi đè chéo dữ liệu giữa Brand và KOC khi upload sai thứ tự.
