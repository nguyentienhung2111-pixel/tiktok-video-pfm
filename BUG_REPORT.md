# Báo cáo Lỗi

## Trạng thái
ĐÃ SỬA CHỮA — ✅ THÀNH CÔNG (xem "Kết quả Sửa lỗi" ở cuối)

## Tiêu đề Lỗi
Dữ liệu trong các Score Card bị tràn viền, biến dạng hoặc bị cắt cụt (truncate/ellipsis) trên các độ phân giải màn hình khác nhau.

## Mô tả Lỗi
Các thẻ Score Card (thẻ hiển thị chỉ số tổng hợp) trên 3 trang (Dashboard Tổng quan, Hiệu suất Thương hiệu, và KOC / Affiliate) sử dụng kích thước chữ cố định quá lớn (`text-3xl font-black`) kết hợp với padding mặc định lớn (`p-6`). 
- Khi số liệu đạt hàng tỷ trở lên (ví dụ: `12.577.287.263 đ` - dài 17 ký tự), phần đuôi tiền tệ (`đ` hoặc `₫`) bị đẩy xuống dòng hoặc bị cắt cụt/tràn viền do không đủ chiều rộng.
- Đặc biệt tại trang **Hiệu suất Thương hiệu** (`/team/content`), 9 thẻ Score Card được dàn trên cùng một hàng ngang ở độ phân giải máy tính (`lg:grid-cols-9`), làm chiều rộng mỗi thẻ bị thu hẹp cực hạn (chỉ khoảng ~110px), khiến toàn bộ các số liệu lớn bị biến thành dạng dấu ba chấm `...` (ví dụ `5.429.60...`), hoàn toàn không thể đọc được thông tin.

## Các bước tái hiện
1. Truy cập vào Dashboard chính (`/dashboard`) hoặc trang KOC (`/team/booking`) với màn hình trung bình hoặc nhỏ. Quan sát phần đuôi đơn vị `đ` ở các ô GMV bị cắt một phần hoặc nhảy dòng.
2. Truy cập vào trang Thương hiệu (`/team/content`) trên màn hình laptop/PC thông thường (độ phân giải ~1366x768 hoặc 1440x900). 
3. Quan sát các Score Card: Các ô GMV Tổng, GMV trực tiếp, Lượt hiển thị, Lượt xem bị rút gọn bằng dấu ba chấm (`...`) như `5.429.60...` do không đủ chiều rộng hiển thị.

## Kết quả Thực tế vs Kết quả Mong đợi

### Kết quả Thực tế
- Font chữ số liệu quá lớn (`text-3xl`), padding thẻ rộng (`p-6`), đơn vị tiền tệ (`đ` / `₫`) dính liền với số bằng khoảng trắng không ngắt dòng (non-breaking space) làm cả cụm văn bản bị tràn viền hoặc cắt cụt.
- Layout 9 cột (`lg:grid-cols-9`) ép tất cả 9 thẻ hiển thị trên 1 hàng ngang kể cả ở màn hình desktop cỡ nhỏ và trung bình, gây sụt giảm nghiêm trọng diện tích hiển thị của mỗi thẻ.

### Kết quả Mong đợi
- Số liệu hiển thị đầy đủ, không bị cắt cụt hoặc biến thành dấu ba chấm trên mọi độ phân giải màn hình.
- Đơn vị tiền tệ `đ` được hiển thị tinh tế (cỡ chữ nhỏ hơn, nằm sát cạnh số) để tiết kiệm không gian và tạo cảm giác premium.
- Bố cục lưới (Grid Layout) co giãn thông minh tùy theo số lượng thẻ, tự động xuống dòng trên màn hình cỡ trung thay vì ép toàn bộ trên một dòng.

## Ngữ cảnh & Môi trường
- **Môi trường**: Next.js App Router (React), Tailwind CSS, TypeScript.
- **Các file bị ảnh hưởng**:
  1. `src/app/(main)/dashboard/page.tsx` (Trang tổng quan - 5 Score Cards)
  2. `src/app/(main)/team/booking/page.tsx` (Trang KOC - 5 Score Cards)
  3. `src/app/(main)/team/content/page.tsx` (Trang Thương hiệu - 9 Score Cards)

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

### 1. Phân tích Kích thước & CSS của Score Card
Mỗi thẻ Score Card được cấu trúc như sau:
```
┌────────────────────────────────────────┐
│ GMV TỔNG                               │  <-- text-xs uppercase tracking-wider
│                                        │
│ 12.577.287.263 đ                       │  <-- text-3xl font-black (30px)
└────────────────────────────────────────┘
```
- Khi thẻ nằm trong hệ thống lưới 5 cột (`lg:grid-cols-5`) hoặc 9 cột (`lg:grid-cols-9`):
  - Chiều rộng của khu vực nội dung (Content Width) = `Card Width` - `2 * Horizontal Padding (p-6 = 48px)`.
  - Với màn hình `1200px` (sau khi trừ Menu Sidebar `240px` còn `960px` nội dung):
    - **Lưới 5 cột**: Chiều rộng mỗi thẻ ~192px ➔ Chiều rộng nội dung thực tế ~144px. Cụm chữ `12.577.287.263 đ` ở cỡ chữ `30px` cần khoảng `170px` để hiển thị ➔ **Bị tràn / nhảy dòng / cắt chữ đ**.
    - **Lưới 9 cột**: Chiều rộng mỗi thẻ ~106px ➔ Chiều rộng nội dung thực tế ~58px. Số liệu GMV hoàn toàn không thể hiển thị và bị ép rút gọn bằng dấu ba chấm `...` (do CSS parent hoặc trình duyệt xử lý tràn).

### 2. Sơ đồ Luồng CSS gây lỗi (Ellipsis/Overflow Flow)
```
[Dữ liệu GMV lớn]
       │
       ▼ (Định dạng sang tiền tệ Việt Nam: "12.577.287.263 đ")
[Chuỗi giá trị dài 17 ký tự]
       │
       ▼ (Đưa vào thẻ <CardContent className="p-6">)
[Nội dung thực tế bị bóp hẹp còn ~58px - 144px]
       │
       ▼ (Áp dụng class "text-3xl font-black")
[Chữ quá lớn so với hộp chứa] ──► Không có khoảng trống ngắt dòng ──► Tràn viền / Ellipsis (...)
```

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### Phương án 1: Tối ưu hóa phản hồi (Responsive Styling), Tách đuôi đơn vị tiền tệ & Thu nhỏ padding (KHUYẾN NGHỊ)
Phương án này giải quyết triệt để lỗi hiển thị bằng cách kết hợp 3 kỹ thuật:
1. **Thu nhỏ Padding của CardContent**:
   - Đối với lưới 5 cột: Giảm xuống `p-4 pt-4 sm:p-6 sm:pt-6` (tăng thêm 16px chiều rộng hiển thị trên mobile/tablet).
   - Đối với lưới 9 cột: Giảm xuống `p-3 pt-3 sm:p-4 sm:pt-4` (tăng thêm 24px chiều rộng hiển thị).
2. **Cập nhật Grid Layout co giãn động**:
   - Trên trang Thương hiệu (`team/content`), đổi `lg:grid-cols-9` thành `lg:grid-cols-5 xl:grid-cols-9`. 
   - Điều này giúp trên màn hình cỡ trung (dưới 1280px), các thẻ tự động xếp thành 2 hàng (5 cột và 4 cột) thay vì bị ép trên 1 hàng, giúp tăng gấp đôi diện tích hiển thị.
3. **Sử dụng Helper Render thông minh (`renderScorecardValue`)**:
   - Tách chuỗi số và ký hiệu đơn vị tiền tệ (`đ` hoặc `₫`).
   - Hiển thị số bằng cỡ chữ co giãn động (Responsive Font Size):
     - Lưới 5 cột: `text-xl sm:text-2xl lg:text-3xl`
     - Lưới 9 cột: `text-lg sm:text-xl xl:text-2xl`
   - Hiển thị ký hiệu `đ` bằng cỡ chữ nhỏ hơn (`text-xs` hoặc `text-sm`) đặt cạnh số bằng flexbox (`align-baseline`), giúp tiết kiệm diện tích tối đa và tạo điểm nhấn thiết kế hiện đại.
   - Thêm `break-all` để trong trường hợp màn hình quá nhỏ, số liệu vẫn tự ngắt dòng xuống dưới thay vì bị biến thành dấu ba chấm.

#### Sơ đồ Giao diện đề xuất (Sau khi sửa):
```
┌────────────────────────────────────────┐
│ GMV TỔNG                               │  <-- text-xs text-[#94a3b8]
│                                        │
│ 12.577.287.263 đ                       │  <-- Số: text-2xl font-black / đ: text-sm font-bold
└────────────────────────────────────────┘
```

### Phương án 2: Chuyển đổi định dạng số sang dạng rút gọn (K, M, B)
- Chuyển đổi các số lớn thành dạng rút gọn như `12.57 B` hoặc `12.57 Tỷ`.
- **Nhược điểm**: Người dùng doanh nghiệp (đặc biệt trong kế toán, đối soát video TikTok) thường yêu cầu nhìn thấy con số chính xác tuyệt đối đến từng đơn vị đồng thay vì con số làm tròn.

---

## Kế hoạch Xác minh

### 1. Kiểm tra thủ công (Manual Verification)
- Khởi chạy local server ở chế độ dev.
- Truy cập lần lượt cả 3 trang: Dashboard (`/dashboard`), Thương hiệu (`/team/content`), và KOC (`/team/booking`).
- Co giãn trình duyệt (Responsive Test) ở các mốc chiều rộng màn hình:
  - Mobile (375px - 425px)
  - Tablet (768px - 1024px)
  - Laptop (1366px - 1440px)
  - Desktop lớn (1920px)
- Xác nhận không còn thẻ nào bị dấu ba chấm (`...`) hoặc chữ `đ` bị mất/che khuất.

### 2. Xác minh kỹ thuật (Technical Verification)
- Chạy `npm run build` để kiểm tra lỗi biên dịch TypeScript.

---

## Kết quả Sửa lỗi (Fix Result) — ✅ THÀNH CÔNG

### Thay đổi đã áp dụng (Minimal changes)
Theo Phương án 1 (khuyến nghị), dùng chung 1 component nhỏ thay vì lặp code:
1. **Component mới** `src/components/ScorecardValue.tsx`: tách phần số và ký hiệu tiền tệ (`₫`/`đ`), render số bằng cỡ chữ co giãn (prop `numberClassName`), ký hiệu `₫` cỡ `text-sm` đặt cạnh số (`flex items-baseline`), thêm `break-all` để số dài tự ngắt dòng thay vì tràn/`...`. Chuỗi không phải tiền tệ (số thường, `%`) render nguyên vẹn.
2. **3 trang** (dashboard, team/booking, team/content): thay `<p class="text-3xl ...">{item.value}</p>` bằng `<ScorecardValue .../>`; thu nhỏ padding responsive (`p-6`→`p-4 sm:p-6` cho lưới 5 cột; `p-6`→`p-3 sm:p-4` cho lưới 9 cột).
3. **Grid co giãn** trang Thương hiệu: `lg:grid-cols-9` → `lg:grid-cols-5 xl:grid-cols-9` (màn hình <1280px xếp 2 hàng thay vì ép 9 thẻ 1 hàng).
   - Cỡ số: 5 cột `text-xl sm:text-2xl lg:text-3xl`; 9 cột `text-lg sm:text-xl xl:text-2xl`.

### Kiểm thử tự động
- **Script tách giá trị** `scratch/test-scorecard-value.mjs` (mô phỏng regex của component):
```
PASS  "12.577.287.263 ₫" -> num "12.577.287.263" unit "₫"
PASS  "0 ₫"              -> num "0"              unit "₫"
PASS  "4.642.713"        -> num "4.642.713"      unit ""
PASS  "12.34%"           -> num "12.34%"         unit ""
PASS  "0.00%"            -> num "0.00%"          unit ""
ALL PASS ✅
```
- **Build**: `✓ Compiled successfully`, TypeScript pass, 18/18 trang — không lỗi.

→ Số tiền lớn (17 ký tự) không còn bị cắt `...` hay mất đuôi `₫`: ký hiệu tách nhỏ, số co giãn theo màn hình và ngắt dòng khi cần; trang Thương hiệu 9 thẻ tự xuống 2 hàng ở màn hình cỡ trung.
