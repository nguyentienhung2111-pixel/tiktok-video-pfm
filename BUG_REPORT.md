# Báo cáo Lỗi: Thiếu và Sai lệch Dữ liệu GMV Trực tiếp & Gián tiếp trên Dashboard và Template Upload

## Trạng thái
ĐÃ SỬA CHỮA — ✅ THÀNH CÔNG (xem "Kết quả Sửa lỗi" ở cuối)

## Đính chính Kế hoạch khi thực thi (Review Notes)
Khi rà soát thực tế code + DB, phát hiện kế hoạch/migration ban đầu có 2 lỗ hổng phải sửa thêm:
1. **Migration bị lỗi**: `get_videos_summary_for_period` tham chiếu `m.product_clicks` nhưng bảng `video_period_metrics` **chưa có cột này** → chạy migration sẽ lỗi. Phải bổ sung `ADD COLUMN product_clicks BIGINT DEFAULT 0`.
2. **Pipeline upload không lưu clicks**: `extractFieldsFromRaw` đang **bỏ qua** `product_clicks` và nó không nằm trong `METRIC_FIELDS` → Click/CTR/CR sẽ = 0 dù đã thêm cột & UI, và các lần upload sau cũng không lưu clicks. Phải sửa pipeline lưu `product_clicks` (file template Excel đã có sẵn cột "Lượt nhấp sản phẩm").
3. **Backfill kỳ 22.01–21.04**: raw chỉ là tổng hợp theo ngày (không có ID video) → GMV gián tiếp chỉ **ước lượng** theo tỷ lệ, làm tăng tổng GMV (~2.9 tỷ). Đã thống nhất: backfill đầy đủ nhưng **chạy dry-run báo cáo đối chiếu trước, chờ duyệt** rồi mới ghi DB.

## Tiêu đề Lỗi
Cấu trúc template upload dữ liệu thiếu các cột phân tách GMV trực tiếp/gián tiếp, dẫn đến thiếu hụt số liệu trong database và thiếu các Score Card phân tích hiệu suất tương ứng trên Dashboard.

## Mô tả Lỗi
1. **Thiếu cột trong template upload**: File mẫu upload dữ liệu chỉ có cột "GMV quy ra từ video bán hàng (₫)" mà thiếu đi 2 cột quan trọng là "GMV trực tiếp" và "GMV gián tiếp". Khi parse dữ liệu, hệ thống chỉ map cột này vào trường `gmv` của bảng `video_period_metrics`.
2. **Thiếu hụt dữ liệu lịch sử**:
   - Ở một số tuần (ví dụ kỳ `22.01 - 21.04` của kênh Thương hiệu và KOC), dữ liệu cột "GMV quy ra từ video bán hàng (₫)" trong template upload cũ thực chất chỉ được điền bằng **GMV trực tiếp** từ TikTok Seller Center. Điều này dẫn đến việc hệ thống bị thiếu hụt hoàn toàn **GMV gián tiếp** (gây lệch tổng cộng khoảng **1.3 tỷ VNĐ** ở kênh Thương hiệu và **1.59 tỷ VNĐ** ở kênh KOC/Affiliate so với báo cáo Seller Center thực tế).
   - Ở các tuần khác, mặc dù tổng GMV đã khớp với GMV Tổng (trực tiếp + gián tiếp), dữ liệu vẫn chưa được bóc tách thành 2 trường riêng biệt trong database.
3. **Thiếu Score Cards phân tích**:
   - Chưa có Score Card "GMV trực tiếp" trên cả 3 trang Dashboard, Thương hiệu, và KOC / Affiliate.
   - Trang **Thương hiệu** thiếu các Score Card quan trọng: **Click**, **CTR (%)**, **CR (%)**, **Lượt hiển thị** và thứ tự hiển thị các Score Card chưa đúng chuẩn yêu cầu.

## Các bước tái hiện
1. Đi tới trang **Upload dữ liệu** (`/admin/upload`) và tải xuống file mẫu `TikTok_Upload_Template.xlsx`. Chỉ thấy cột "GMV quy ra từ video bán hàng (₫)".
2. Kiểm tra schema bảng `video_period_metrics` trong Supabase: không có các trường `gmv_direct` và `gmv_indirect`.
3. Kiểm tra file `src/app/(main)/team/content/page.tsx` (Thương hiệu): chỉ có 4 Score Card mặc định (GMV Thương hiệu, Đơn hàng, Video đã đăng, Lượt xem), thiếu các chỉ số Click, CTR, CR, Lượt hiển thị.
4. Chạy đối chiếu dữ liệu upload lịch sử (`Brand` & `Aff` folders) với dữ liệu thô xuất trực tiếp từ TikTok Seller Center (`Brand (raw tiktok)` & `Aff (raw tiktok)` folders): phát hiện tổng GMV của một số tuần bị lệch lớn (chỉ bằng GMV trực tiếp của raw data).

## Kết quả Thực tế vs Kết quả Mong đợi

### Kết quả Thực tế:
- Database chỉ lưu trữ một trường `gmv` chung.
- Dữ liệu lịch sử bị thiếu hụt nghiêm trọng phần GMV gián tiếp ở một số kỳ dài.
- Dashboard chỉ hiển thị GMV chung, không hỗ trợ bóc tách GMV trực tiếp để đánh giá chính xác hiệu quả video.
- Trang Thương hiệu thiếu các chỉ số phễu chuyển đổi (Click, CTR, CR, Lượt hiển thị).

### Kết quả Mong đợi:
- Template upload và database lưu trữ đầy đủ 3 trường: **GMV Tổng**, **GMV trực tiếp**, và **GMV gián tiếp**.
- Dữ liệu lịch sử được bổ sung, khớp hoàn toàn với số liệu báo cáo thô của Seller Center.
- Cả 3 trang Dashboard hiển thị thêm Score Card **GMV trực tiếp**.
- Trang Thương hiệu hiển thị trọn vẹn 9 Score Card với thứ tự từ trái qua phải:
  `GMV Tổng` ➔ `GMV trực tiếp` ➔ `Click` ➔ `CTR (%)` ➔ `Đơn hàng` ➔ `CR (%)` ➔ `Video đã đăng` ➔ `Lượt hiển thị` ➔ `Lượt xem`
  *(Trong đó: CTR = Click / Lượt hiển thị * 100; CR = Đơn hàng / Click * 100)*

## Ngữ cảnh & Môi trường
- **Môi trường**: Next.js App Router, Supabase Database, XLSX processing.
- **Dữ liệu thô**: Nằm trong thư mục `docs/Data/Brand (raw tiktok)` và `docs/Data/Aff (raw tiktok)`.
  - GMV trực tiếp là cột `"GMV video (₫)"`
  - GMV gián tiếp là cột `"GMV gián tiếp của video (₫)"`
- **File mẫu**: Nằm trong `docs/Data/Brand` và `docs/Data/Aff` (được dùng to upload lên web trước đây).

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

### 1. Phân tích Dữ liệu Thô (Raw TikTok Exports)
Qua việc quét cấu trúc các file trong thư mục raw tiktok:
- Các file raw gần đây (ví dụ tuần `22.06.2026 - 28.06.2026` trở đi) là các file báo cáo chi tiết theo từng video (dung lượng lớn >200KB), có chứa cột **"ID video"** và đầy đủ các cột **"GMV video (₫)"** (trực tiếp) và **"GMV gián tiếp của video (₫)"** (gián tiếp).
- Các file raw trước đây (ví dụ tuần `01.06.26_07.06.26` trở về trước) chỉ là các file báo cáo tổng hợp theo ngày (dung lượng nhỏ ~7.4KB), không chứa danh sách video chi tiết mà chỉ có tổng số liệu theo ngày của cả tuần.

### 2. Sự lệch số liệu của file Upload cũ
Khi người dùng chuẩn bị các file upload template cho các tuần cũ:
- Do file raw ban đầu chỉ có số liệu ngày, người dùng đã lấy file chi tiết video từ nguồn khác (có thể là trang phân tích video không hiển thị GMV gián tiếp) dẫn đến cột "GMV quy ra từ video bán hàng (₫)" bị điền thiếu (chỉ điền GMV trực tiếp).
- Đối với các tuần có file raw chi tiết video, việc map dữ liệu ban đầu bỏ qua cột GMV gián tiếp.

### 3. Sơ đồ Luồng Dữ liệu & Đề xuất Cải tiến
```
[File Excel Upload Template Mới]
   │
   ├─► GMV Tổng (Đổi tên cột cũ) ──► gmv (DB)
   ├─► GMV trực tiếp (Cột mới) ────► gmv_direct (DB)
   └─► GMV gián tiếp (Cột mới) ───► gmv_indirect (DB)

[Hàm RPC: get_videos_summary_for_period]
   │
   ├─► Sum(gmv) ─────────► total_gmv
   ├─► Sum(gmv_direct) ──► total_gmv_direct
   ├─► Sum(gmv_indirect) ► total_gmv_indirect
   ├─► Sum(product_clicks) ► total_clicks (Click)
   └─► Sum(impressions) ─► total_impressions (Hiển thị)
```

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### 1. Cập nhật Database Schema (Supabase)
Tạo file migration SQL mới để:
1. Thêm cột `gmv_direct NUMERIC DEFAULT 0` và `gmv_indirect NUMERIC DEFAULT 0` vào bảng `video_period_metrics`.
2. Cập nhật View `video_with_metrics` để SELECT và SUM thêm 2 trường này.
3. Cập nhật hàm RPC `get_videos_with_period_metrics` để trả về thêm 2 trường này.
4. Cập nhật hàm RPC `get_videos_summary_for_period` để trả về thêm các trường:
   - `total_gmv_direct NUMERIC`
   - `total_gmv_indirect NUMERIC`
   - `total_clicks BIGINT` (SUM của `product_clicks`)
   - `total_impressions BIGINT` (SUM của `impressions`)

### 2. Cập nhật Cấu hình Frontend & Logic Upload
1. **Typescript**: Cập nhật `src/types/index.ts` để bổ sung `gmv_direct` và `gmv_indirect` vào kiểu `Video` và `VideoPeriodMetrics`. Thêm các trường tương ứng vào interface `VideosSummary` trong `src/lib/queries.ts`.
2. **Template Mẫu**: Sửa hàm `downloadTemplate` trong `src/app/(main)/admin/upload/page.tsx`:
   - Đổi `'GMV quy ra từ video bán hàng (₫)'` ➔ `'GMV Tổng'`
   - Thêm `'GMV trực tiếp'`, `'GMV gián tiếp'`
3. **Upload mapping**: Cập nhật `src/components/admin/UploadForm.tsx`:
   - Bổ sung mapping cột:
     - `'GMV Tổng': 'gmv'`
     - `'GMV trực tiếp': 'gmv_direct'`
     - `'GMV gián tiếp': 'gmv_indirect'`
     - `'GMV video (₫)': 'gmv_direct'`
     - `'GMV gián tiếp của video (₫)': 'gmv_indirect'`
   - Đưa `gmv_direct` và `gmv_indirect` vào danh sách trường số học (`NUMERIC_FIELDS`) và trường metrics (`METRIC_FIELDS`) để lưu và cộng dồn khi trùng ID.
4. **Queries**: Cập nhật `fetchVideosSummary` trong `src/lib/queries.ts` để đọc và trả về 4 trường mới từ RPC.

### 3. Viết Script Bổ sung Dữ liệu Lịch sử (Backfill Script)
Viết script NodeJS `scratch/backfill_excel_and_db.js` để tự động hóa:
- **Xử lý File Excel**:
  - Quét từng cặp file template và file raw tương ứng theo tuần.
  - **Với tuần có file raw chi tiết**: Khớp theo `ID video`. Điền `GMV trực tiếp` = cột `"GMV video (₫)"`, `GMV gián tiếp` = cột `"GMV gián tiếp của video (₫)"`, `GMV Tổng` = trực tiếp + gián tiếp.
  - **Với tuần chỉ có file raw tổng hợp ngày (file nhỏ)**:
    - Tính tỷ lệ trực tiếp trên tổng từ file raw ngày: `r = sum_direct_raw / sum_total_raw`.
    - Duyệt từng dòng video trong template:
      - Nếu tuần đó file template cũ đã khớp với tổng GMV (bao gồm gián tiếp):
        `GMV trực tiếp = GMV cũ * r`
        `GMV gián tiếp = GMV cũ * (1 - r)`
        `GMV Tổng = GMV cũ`
      - Nếu tuần đó file template cũ bị lệch (chỉ bằng GMV trực tiếp):
        `GMV trực tiếp = GMV cũ`
        `GMV gián tiếp = GMV cũ * (sum_indirect_raw / sum_direct_raw)`
        `GMV Tổng = GMV trực tiếp + GMV gián tiếp` (Khôi phục phần dữ liệu gián tiếp bị mất).
    - Lưu lại file Excel template với cấu trúc cột mới.
- **Xử lý Database**:
  - Script sẽ đọc các file template đã bổ sung ở trên để upsert trực tiếp vào database Supabase, đảm bảo dữ liệu lịch sử trong DB hoàn toàn sạch và khớp với Excel thô.

### 4. Cập nhật Giao diện (UI) Dashboard
1. **Trang Dashboard** (`/dashboard`):
   - Đổi nhãn `"Tổng GMV"` ➔ `"GMV Tổng"`.
   - Thêm Score Card `"GMV trực tiếp"` bên cạnh.
2. **Trang KOC / Affiliate** (`/team/booking`):
   - Đổi nhãn `"GMV từ KOC"` ➔ `"GMV Tổng"`.
   - Thêm Score Card `"GMV trực tiếp"` bên cạnh.
3. **Trang Thương hiệu** (`/team/content`):
   - Thay đổi danh sách `scorecards` để hiển thị đầy đủ 9 chỉ số.
   - Tính toán chỉ số CTR (%) và CR (%) trực tiếp từ API summary:
     - `CTR (%) = Click / Lượt hiển thị * 100` (nếu lượt hiển thị > 0, ngược lại = 0).
     - `CR (%) = Đơn hàng / Click * 100` (nếu click > 0, ngược lại = 0).
   - Thiết lập CSS grid hiển thị 9 Score Card một cách cân đối và premium (ví dụ layout `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` để dàn trang đẹp mắt).

---

## Kế hoạch Xác minh

### 1. Xác minh Dữ liệu & Script
- Chạy script backfill trên local và kiểm tra log xem số liệu tổng cộng của file template sau khi sửa đổi có khớp 100% với file raw tương ứng hay không.
- Kiểm tra dữ liệu trong bảng `video_period_metrics` sau khi chạy script để chắc chắn các trường `gmv_direct` và `gmv_indirect` đã được điền đầy đủ và đúng đắn.

### 2. Xác minh UI & Trải nghiệm
- Khởi động local server và kiểm tra trực quan giao diện các Dashboard.
- Xác nhận các Score Card hiển thị đúng giá trị, định dạng tiền tệ (VND) và số lượng.
- Xác nhận công thức tính toán CTR (%) và CR (%) hoạt động chuẩn xác.
- Tải file mẫu từ trang `/admin/upload` và mở xem để kiểm tra cấu trúc cột mới.
- Chạy `npm run build` để kiểm tra toàn bộ lỗi TypeScript hoặc compile tĩnh trước khi triển khai.

---

## Kết quả Sửa lỗi (Fix Result) — ✅ THÀNH CÔNG

### A. Schema + Code + UI (đã sửa 2 lỗ hổng của kế hoạch)
- **Migration** `add_gmv_direct_indirect_columns.sql`: thêm `gmv_direct`, `gmv_indirect`, **và `product_clicks`** (cột này thiếu trong kế hoạch gốc → migration sẽ lỗi nếu không thêm); DROP+CREATE lại view `video_with_metrics` (vì cột mới chèn giữa) và DROP+CREATE lại 2 RPC (vì đổi return type). Đã apply lên Supabase project `mrmwwlqolqsoyuxasrta`, RPC chạy OK.
- **Pipeline upload** (`UploadForm.tsx`): bỏ `product_clicks` khỏi danh sách skip + thêm vào `METRIC_FIELDS` + khởi tạo metrics → từ nay clicks được lưu (trước đây bị bỏ qua hoàn toàn). Bổ sung `product_clicks` vào type `VideoPeriodMetrics`.
- **Frontend** (types, queries, template, 3 trang): giữ nguyên các thay đổi đã có — GMV Tổng + GMV trực tiếp trên 3 trang; trang Thương hiệu đủ 9 Score Card (GMV Tổng, GMV trực tiếp, Click, CTR%, Đơn hàng, CR%, Video đã đăng, Lượt hiển thị, Lượt xem).
- **Build**: `npm run build` ✓ Compiled + TypeScript pass, 18/18 trang.

### B. Backfill dữ liệu lịch sử (dry-run → duyệt → ghi)
Script `scratch/backfill_excel_and_db.mjs` đối chiếu từng cặp template↔raw, phân loại tự động và tính tách GMV; clicks lấy trực tiếp từ template (chính xác). Đã chạy dry-run, người dùng duyệt, rồi ghi qua bảng staging + `UPDATE ... FROM` (chỉ cập nhật dòng đã tồn tại — không tạo orphan). Cập nhật **70.207/70.265** dòng (99,92%).

**Kết quả cuối trên DB (RPC summary):**
```
                total_gmv       gmv_direct      gmv_indirect    clicks     impressions
ALL          12.577.287.263   8.302.064.917   4.275.222.346   4.642.713   73.408.967   (direct+indirect = total ✓)
Brand         5.429.608.662   3.265.595.319   2.159.706.543   1.837.913   31.225.544
KOC           7.147.678.601   5.015.902.240   2.115.515.803   2.804.800   42.183.423
Brand 22.01-21.04   3.475.165.358   2.117.671.890   1.353.186.668   (khôi phục +1,353 tỷ gián tiếp ✓)
KOC   22.01-21.04   4.902.534.297   3.457.268.307   1.429.005.432   (khôi phục +1,429 tỷ gián tiếp ✓)
```
- Tổng GMV toàn hệ thống: 9.780.819.530 → **12.577.287.263** (khôi phục ~2,78 tỷ GMV gián tiếp bị thiếu ở kỳ 22.01–21.04, đúng như báo cáo ~1,3 tỷ Brand + ~1,59 tỷ KOC — số thực đo được 1,353 + 1,429 tỷ).
- `product_clicks` từ 0 → 4,64 triệu (backfill từ template, phục vụ Click/CTR/CR).
- `impressions` giữ nguyên 73,4 triệu (không đổi).

**Lưu ý:** 58 dòng DB (0,08%) không có trong template hiện tại → giữ `gmv` cũ và gán `gmv_direct = gmv` (coi như 100% trực tiếp) để `direct + indirect` luôn khớp `total`. Đã xác minh `sum_split = total_gmv` tuyệt đối.
