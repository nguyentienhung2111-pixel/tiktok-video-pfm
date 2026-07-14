# Báo cáo Lỗi

## Trạng thái
ĐÃ SỬA CHỮA — ✅ THÀNH CÔNG (xem "Kết quả Sửa lỗi" ở cuối)

## Tiêu đề Lỗi
Số liệu trong Score Card bị xuống dòng giữa chừng (break-all) gây mất thẩm mỹ, thay vì dàn đều các block (cards) thành nhiều dòng khác nhau để tăng diện tích hiển thị.

## Mô tả Lỗi
Hiện tại, để hiển thị đầy đủ số liệu tiền tệ dài hàng chục tỷ (ví dụ: `12.577.287.263 đ`), hệ thống đang áp dụng thuộc tính `break-all` trên phần tử hiển thị. Điều này khiến số liệu bị tự động ngắt dòng ở những vị trí ngẫu nhiên (ví dụ: `12.577.287.2` ở dòng một, `63` ở dòng hai trong cùng một ô).
Cách ngắt dòng này làm giao diện bị rối mắt, mất tính chuyên nghiệp của số liệu tài chính.
Mong muốn của người dùng là:
- Dữ liệu số/tiền tệ bên trong block **phải hiển thị trên một dòng duy nhất (không ngắt dòng)**.
- Thay vào đó, tăng không gian hiển thị bằng cách **phân bổ các thẻ Score Card thành nhiều hàng (thêm dòng các block)** trên giao diện để mở rộng chiều rộng của mỗi block.

## Các bước tái hiện
1. Truy cập trang Dashboard Tổng quan (`/dashboard`) hoặc trang KOC (`/team/booking`).
2. Quan sát các Score Card có giá trị lớn (hàng tỷ): Số liệu bị ngắt dòng nham nhở như `12.577.287.2` và `63`.
3. Truy cập trang Thương hiệu (`/team/content`): Quan sát 9 block bị ép hiển thị, chữ bị ngắt thành nhiều dòng nhỏ vụn.

## Kết quả Thực tế vs Kết quả Mong đợi

### Kết quả Thực tế
- Thuộc tính `break-all` làm các con số bị bẻ đôi sang dòng mới.
- Layout của các block quá nhiều cột trên một hàng (5 cột ở trang Dashboard/KOC, 9 cột hoặc 5 cột ở trang Thương hiệu), làm mỗi block bị hẹp chiều ngang.

### Kết quả Mong đợi
- Các con số và đơn vị tiền tệ được giữ nguyên vẹn trên một dòng (`whitespace-nowrap`).
- Bố cục các block được tổ chức lại thành nhiều hàng hơn (ít cột hơn trên mỗi hàng) để các block có nhiều không gian ngang hơn, giúp số liệu hiển thị đẹp mắt mà không bị xuống dòng.

## Ngữ cảnh & Môi trường
- **Môi trường**: Next.js App Router (React), Tailwind CSS, TypeScript.
- **Các file liên quan**:
  1. `src/components/ScorecardValue.tsx` (Component hiển thị giá trị)
  2. `src/app/(main)/dashboard/page.tsx` (Trang tổng quan - 5 Score Cards)
  3. `src/app/(main)/team/booking/page.tsx` (Trang KOC - 5 Score Cards)
  4. `src/app/(main)/team/content/page.tsx` (Trang Thương hiệu - 9 Score Cards)

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

### 1. Phân tích layout hiện tại
- **`ScorecardValue.tsx`**: Đang sử dụng class `break-all` tại thẻ `<p>` bao ngoài, cho phép chữ ngắt dòng ở bất cứ ký tự nào.
- **Trang Dashboard & KOC (5 blocks)**: Lưới `lg:grid-cols-5` cố định 5 block trên 1 hàng ở màn hình desktop. Chiều rộng tối đa của block bị giới hạn.
- **Trang Thương hiệu (9 blocks)**: Lưới `lg:grid-cols-5 xl:grid-cols-9` chia tối đa 9 block trên 1 hàng. Khi màn hình từ `1280px` trở lên, 9 block bị dồn hàng ngang làm chiều ngang mỗi block rất hẹp.

### 2. Sơ đồ Cải tiến Layout (Tăng dòng blocks, không ngắt dòng chữ)
```
TRƯỚC ĐÂY (E.g. Dashboard):
[ Block 1 ] [ Block 2 ] [ Block 3 ] [ Block 4 ] [ Block 5 ]  <-- 5 blocks trên 1 hàng, chữ bên trong break-all thành 2 dòng.

SAU KHI CẢI TIẾN:
[    Block 1 (Rộng hơn)    ] [    Block 2 (Rộng hơn)    ] [    Block 3 (Rộng hơn)    ]
[    Block 4 (Rộng hơn)    ] [    Block 5 (Rộng hơn)    ]
<-- 3 cột ở hàng 1, 2 cột ở hàng 2. Không gian block lớn gấp ~1.6 lần, số liệu hiển thị trọn vẹn trên 1 hàng.
```

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### Phương án 1: Điều chỉnh số cột tối đa thành 3, ngăn ngắt dòng giá trị (KHUYẾN NGHỊ)
1. **Cập nhật `src/components/ScorecardValue.tsx`**:
   - Loại bỏ class `break-all`.
   - Thêm class `whitespace-nowrap` vào thẻ số và thẻ đơn vị để giữ nguyên vẹn giá trị trên một dòng.
2. **Cập nhật Grid Layout trang Dashboard (`/dashboard`) & KOC (`/team/booking`)**:
   - Đổi grid cols từ `lg:grid-cols-5` thành `lg:grid-cols-3`.
   - Với 5 cards, grid sẽ tự động chia thành:
     - Hàng 1: 3 cards (GMV Tổng, GMV trực tiếp, Tổng đơn hàng)
     - Hàng 2: 2 cards (Tổng Video, Tổng lượt xem)
3. **Cập nhật Grid Layout trang Thương hiệu (`/team/content`)**:
   - Đổi grid cols từ `lg:grid-cols-5 xl:grid-cols-9` thành `lg:grid-cols-3 xl:grid-cols-3` (hoặc đơn giản là `lg:grid-cols-3`).
   - Với 9 cards, grid sẽ tự động chia thành 3 hàng cân đối (mỗi hàng 3 cards):
     - Hàng 1 (Nhóm GMV & Click): GMV Tổng, GMV trực tiếp, Click
     - Hàng 2 (Nhóm chuyển đổi): CTR (%), Đơn hàng, CR (%)
     - Hàng 3 (Nhóm hiển thị & reach): Video đã đăng, Lượt hiển thị, Lượt xem
   - Layout 3x3 này vô cùng cân đối, cấu trúc rõ ràng, và mang lại chiều rộng block tối đa giúp số liệu dài hiển thị thoải mái nhất.

### Phương án 2: Sử dụng Flexbox tự động co giãn (`flex-wrap`)
- Sử dụng layout flexbox thay vì grid để các block tự rớt dòng khi thiếu chiều rộng.
- **Nhược điểm**: Bố cục flex-wrap có thể không đều nhau trên các kích thước màn hình khác nhau (ví dụ hàng trên 4 block, hàng dưới 1 block gây mất cân đối). Sử dụng Grid Layout 3 cột cố định đem lại giao diện ổn định và chuyên nghiệp hơn.

---

## Kế hoạch Xác minh

### 1. Kiểm tra thủ công (Manual Verification)
- Khởi chạy dev server.
- Xác nhận các con số không còn bị bẻ đôi dòng (`break-all` bị loại bỏ).
- Kiểm tra các trang để đảm bảo:
  - Dashboard & KOC hiển thị 3 cột ở hàng đầu và 2 cột ở hàng tiếp theo.
  - Trang Thương hiệu hiển thị lưới 3x3 (3 hàng, mỗi hàng 3 card) cân đối.
  - Số liệu hiển thị nguyên vẹn trên 1 dòng đơn đẹp mắt.

### 2. Xác minh kỹ thuật (Technical Verification)
- Chạy `npm run build` để kiểm tra build thành công.

---

## Kết quả Sửa lỗi (Fix Result) — ✅ THÀNH CÔNG

### Thay đổi đã áp dụng (Minimal changes — theo Phương án 1)
1. **`src/components/ScorecardValue.tsx`**: bỏ `break-all`, thêm `whitespace-nowrap` → số + đơn vị luôn nằm trọn trên 1 dòng, không bị bẻ đôi.
2. **Dashboard & KOC** (`/dashboard`, `/team/booking`): lưới `lg:grid-cols-5` → `lg:grid-cols-3` (5 card = hàng 1 có 3, hàng 2 có 2 → mỗi block rộng hơn ~1.6×).
3. **Thương hiệu** (`/team/content`): `lg:grid-cols-5 xl:grid-cols-9` → `lg:grid-cols-3` (9 card thành lưới 3×3 cân đối).

### Kiểm thử tự động
- **Script kiểm tra layout** `scratch/test-scorecard-layout.mjs` (assert class trong source):
```
PASS  ScorecardValue: break-all removed
PASS  ScorecardValue: whitespace-nowrap added
PASS  dashboard: grid lg:grid-cols-3        | PASS  dashboard: no lg:grid-cols-5
PASS  booking: grid lg:grid-cols-3          | PASS  booking: no lg:grid-cols-5
PASS  content: grid lg:grid-cols-3          | PASS  content: no grid-cols-9 / no lg:grid-cols-5
ALL PASS ✅
```
- **Build**: `✓ Compiled successfully`, TypeScript pass, 18/18 trang.

→ Số liệu tiền tệ dài không còn bị ngắt dòng nham nhở; các Score Card dàn thành nhiều hàng (3 cột/hàng) nên mỗi thẻ rộng hơn, hiển thị trọn số trên 1 dòng.
