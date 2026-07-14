# Báo cáo Lỗi

## Trạng thái
ĐÃ SỬA CHỮA — ✅ THÀNH CÔNG (xem "Kết quả Sửa lỗi" ở cuối)

## Tiêu đề Lỗi
Bộ lọc nhanh thời gian ở các trang Dashboard, Thương hiệu, KOC / Affiliate chưa hỗ trợ chu kỳ lọc theo tuần phù hợp với đặc thù dữ liệu upload.

## Mô tả Lỗi
Dữ liệu hiệu suất video của hệ thống được tải lên định kỳ theo từng tuần (file Excel xuất từ TikTok Seller Center). Hiện tại, các bộ lọc nhanh (Quick Filters) của bộ chọn thời gian (`DateRangePicker`) đang được tính toán theo số ngày lùi trực tiếp từ ngày hôm nay (`today`), cụ thể:
* "7 ngày qua": Lọc từ `subDays(today, 7)` đến `today`.
* "28 ngày qua": Lọc từ `subDays(today, 28)` đến `today`.
* "90 ngày qua": Lọc từ `subDays(today, 90)` đến `today`.

Cách tính này lấy mốc đến ngày hôm nay (`today`), trong khi tuần hiện tại chưa kết thúc hoặc chưa có dữ liệu mới đầy đủ. Điều này dẫn đến việc số liệu hiển thị bị lẻ tuần, thiếu hụt hoặc lẫn lộn dữ liệu của tuần hiện tại (chưa hoàn thành).

Khách hàng mong muốn thay đổi các bộ lọc nhanh để hoạt động theo chu kỳ tuần hoàn chỉnh (bắt đầu từ Thứ Hai và kết thúc vào Chủ Nhật của các tuần đã hoàn thành):
* **Tuần trước**: Lọc 1 tuần gần nhất đã hoàn thành (Thứ Hai tuần trước -> Chủ Nhật tuần trước).
  *(VD: hôm nay là 14/07/26 thì sẽ lọc tuần 06/07/2026 - 12/07/2026)*
* **28 ngày qua**: Lọc 4 tuần gần nhất đã hoàn thành (Thứ Hai cách đây 4 tuần -> Chủ Nhật tuần trước).
  *(VD: hôm nay là 14/07/26 thì sẽ lọc từ 15/06/2026 - 12/07/2026)*
* **03 tháng qua**: Lọc 12 tuần gần nhất đã hoàn thành (Thứ Hai cách đây 12 tuần -> Chủ Nhật tuần trước).
  *(VD: hôm nay là 14/07/26 thì sẽ lọc từ 20/04/2026 - 12/07/2026)*

## Các bước tái hiện
1. Truy cập các trang **Dashboard**, **Thương hiệu** (Brand), hoặc **KOC / Affiliate**.
2. Nhấp vào bộ chọn thời gian ở góc trên cùng bên phải.
3. Chọn các tùy chọn "7 ngày qua", "28 ngày qua", hoặc "90 ngày qua" ở mục "Lọc nhanh".
4. Quan sát dải ngày lọc được áp dụng trên thanh chọn: Ngày kết thúc luôn là ngày hiện tại (`today`), chưa được gom cụm tròn theo tuần.

## Kết quả Thực tế vs Kết quả Mong đợi
* **Kết quả Thực tế**: Các bộ lọc nhanh lấy ngày kết thúc là ngày hiện tại (`today`), không căn chỉnh theo chu kỳ dữ liệu tuần dẫn đến thiếu dữ liệu tuần hiện tại hoặc hiển thị không trọn vẹn tuần.
* **Kết quả Mong đợi**: Các bộ lọc nhanh được cấu hình lại để tự động tìm tuần hoàn chỉnh gần nhất (kết thúc vào Chủ Nhật của tuần trước đó) và tính ngược về trước theo các khoảng 1 tuần, 4 tuần, 12 tuần bắt đầu từ Thứ Hai:
  * "Tuần trước" thay thế cho "7 ngày qua": Lọc từ Thứ Hai tuần trước -> Chủ Nhật tuần trước.
  * "28 ngày qua": Lọc từ Thứ Hai 4 tuần trước -> Chủ Nhật tuần trước.
  * "03 tháng qua" thay thế cho "90 ngày qua": Lọc từ Thứ Hai 12 tuần trước -> Chủ Nhật tuần trước.

## Ngữ cảnh & Môi trường
* **Hệ thống**: Next.js App Router, `date-fns` phiên bản `^4.1.0`.
* **Môi trường**: Cả Local Dev và Production.
* **Tệp tin liên quan**: `src/components/date-range-picker.tsx`.
* **Thời gian hiện tại giả định trong ví dụ**: 14/07/2026 (Thứ Ba).

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

### 1. Phân tích Tệp tin `src/components/date-range-picker.tsx`
Tệp `src/components/date-range-picker.tsx` định nghĩa mảng `presets` ở dòng 30-66. Các presets này tính toán ngày dựa trên `subDays(startOfToday(), N)` và `to` luôn là `startOfToday()`:
```typescript
    {
      label: '7 ngày qua',
      getValue: () => ({
        from: subDays(startOfToday(), 7),
        to: startOfToday(),
      }),
    },
```
Khi dữ liệu được upload theo chu kỳ tuần đầy đủ, việc lấy `to: startOfToday()` sẽ chứa cả tuần hiện tại (chưa kết thúc và chưa có/thiếu dữ liệu).

### 2. Giải pháp kỹ thuật dùng `date-fns`
Cần thay đổi logic tính toán trong `presets` bằng cách sử dụng các hàm hỗ trợ tuần từ `date-fns` như `subWeeks`, `startOfWeek`, `endOfWeek` kết hợp với tham số `{ weekStartsOn: 1 }` (quy định Thứ Hai là ngày đầu tuần theo chuẩn Việt Nam / ISO).

#### Luồng dữ liệu và Hàm gọi cũ:
```
[startOfToday() (14/7/2026)] ────> [subDays(today, 28) (16/6/2026)] 
                                         │
                                         ▼
                             Khoảng lọc: 16/6/2026 - 14/7/2026 (Bao gồm tuần hiện tại chưa hết)
```

#### Luồng dữ liệu và Hàm gọi mới đề xuất:
```
[startOfToday() (14/7/2026)]
        │
        ▼  (Tính lùi 1 tuần để lấy tuần hoàn thành gần nhất)
[subWeeks(today, 1) (7/7/2026)]
        │
        ├─> [endOfWeek(..., { weekStartsOn: 1 })] ───> Chủ Nhật (12/7/2026) [Mốc kết thúc: TO]
        │
        └─> [subWeeks(today, N)] ───> [startOfWeek(..., { weekStartsOn: 1 })] ───> Thứ Hai [Mốc bắt đầu: FROM]
                                                                                (N = 1: 6/7 | N = 4: 15/6 | N = 12: 20/4)
```

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### 📌 Phương án Khuyến nghị: Cập nhật cấu hình presets trong `src/components/date-range-picker.tsx`

Chúng ta sẽ giữ lại tùy chọn "Hôm nay" và "Tất cả thời gian", đồng thời thay đổi/cấu hình lại 3 bộ lọc ở giữa:

1. **Import các hàm cần thiết từ `'date-fns'`**:
   ```typescript
   import { addDays, format, subDays, startOfToday, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
   ```

2. **Cấu hình lại mảng `presets`**:
   * **Thay thế "7 ngày qua" bằng "Tuần trước"**:
     ```typescript
     {
       label: 'Tuần trước',
       getValue: () => {
         const today = startOfToday();
         return {
           from: startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }),
           to: endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }),
         };
       },
     }
     ```
   * **Cập nhật "28 ngày qua" để hoạt động theo tuần**:
     ```typescript
     {
       label: '28 ngày qua',
       getValue: () => {
         const today = startOfToday();
         return {
           from: startOfWeek(subWeeks(today, 4), { weekStartsOn: 1 }),
           to: endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }),
         };
       },
     }
     ```
   * **Thay thế "90 ngày qua" bằng "03 tháng qua" (12 tuần gần nhất)**:
     ```typescript
     {
       label: '03 tháng qua',
       getValue: () => {
         const today = startOfToday();
         return {
           from: startOfWeek(subWeeks(today, 12), { weekStartsOn: 1 }),
           to: endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }),
         };
       },
     }
     ```

---

## Kế hoạch Xác minh

### Kiểm thử thủ công:
1. Chạy ứng dụng Next.js ở chế độ phát triển (`npm run dev`).
2. Mở trình duyệt và truy cập trang `/dashboard`.
3. Bấm chọn bộ lọc thời gian và nhấp chọn lần lượt các preset:
   * **Tuần trước**: Kiểm tra xem dải ngày hiển thị có khớp với Thứ Hai đến Chủ Nhật tuần trước hay không.
   * **28 ngày qua**: Kiểm tra xem dải ngày có kéo dài từ Thứ Hai cách đây 4 tuần đến Chủ Nhật tuần trước hay không.
   * **03 tháng qua**: Kiểm tra xem dải ngày có kéo dài từ Thứ Hai cách đây 12 tuần đến Chủ Nhật tuần trước hay không.
4. Lặp lại bước tương tự trên trang Thương hiệu (`/team/content`) và KOC / Affiliate (`/team/booking`).

### Kiểm thử tự động / Biên dịch:
1. Chạy lệnh `npm run build` để kiểm tra lỗi TypeScript hoặc cú pháp Next.js liên quan đến các hàm import từ `date-fns`.

---

## Kết quả Sửa lỗi (Fix Result) — ✅ THÀNH CÔNG

### Thay đổi đã áp dụng (Minimal changes)
Chỉ sửa 1 file `src/components/date-range-picker.tsx`:
* Thêm import `subWeeks, startOfWeek, endOfWeek` từ `date-fns` (giữ nguyên `addDays/subDays` vì preset "Tất cả thời gian" vẫn dùng).
* Đổi 3 preset giữa sang tính theo tuần hoàn chỉnh (`weekStartsOn: 1` = Thứ Hai), kết thúc vào Chủ Nhật tuần trước:
  * "7 ngày qua" → **"Tuần trước"** (1 tuần)
  * **"28 ngày qua"** (4 tuần, giữ nhãn)
  * "90 ngày qua" → **"03 tháng qua"** (12 tuần)

### Kiểm thử tự động (script tái hiện, `today` cố định = 14/07/2026)
Script `scratch/test-date-presets.mjs` dùng đúng công thức date-fns của component:

```
PASS  Tuần trước     = 06/07/2026 -> 12/07/2026  (kỳ vọng 06/07/2026 -> 12/07/2026)
PASS  28 ngày qua    = 15/06/2026 -> 12/07/2026  (kỳ vọng 15/06/2026 -> 12/07/2026)
PASS  03 tháng qua   = 20/04/2026 -> 12/07/2026  (kỳ vọng 20/04/2026 -> 12/07/2026)

ALL TESTS PASSED ✅
```

Cả 3 preset khớp chính xác kỳ vọng trong báo cáo (Thứ Hai → Chủ Nhật, không còn dính tuần hiện tại chưa hoàn thành).

### Biên dịch
```
✓ Compiled successfully in 17.5s
  Finished TypeScript ...
✓ Generating static pages (18/18)
```

Không lỗi TypeScript/build. `DateRangePicker` được dùng chung ở Dashboard, `/team/content` (Thương hiệu) và `/team/booking` (KOC/Affiliate) nên bản sửa áp dụng đồng thời cho cả 3 trang.
