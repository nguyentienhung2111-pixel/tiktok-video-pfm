# Bug Report

## Status
ĐANG SỬA CHỮA — đã implement guard tên file ↔ kỳ báo cáo. Phân tích hoàn chỉnh đã xác định 4 vấn đề (xem "Bức tranh tổng thể").

---

## BỨC TRANH TỔNG THỂ (cập nhật mới nhất — đối chiếu với raw TikTok)

Đối chiếu file đã upload (`docs/Data/Brand`, `Aff`) với file raw TikTok theo ngày (`docs/Data/Brand (raw tiktok)`, `Aff (raw tiktok)`), cột **"GMV đến từ video (₫)"** = trực tiếp + gián tiếp:

| | Tổng file đã up | Tổng raw "đến từ video" = TikTok Seller |
|---|---|---|
| Brand (22/1–21/6) | 3.799.981.169 | **5.121.262.670** ✅ trùng số TikTok Seller |
| Aff (22/1–21/6) | 5.242.128.636 | **6.686.485.862** ✅ trùng số TikTok Seller |

**4 vấn đề độc lập (2 cái đẩy số ngược chiều nhau nên hiện tổng đang gần đúng một cách tình cờ):**

1. **Kỳ rác `02-03 → 02-28`** (1 lần upload chọn sai kỳ) → đếm trùng **+1,46 tỷ** (làm PHỒNG). Cách sửa: xoá kỳ này.
2. **File baseline 3 tháng `22/1 → 21/4` bị CẮT CỤT** → export per-video không đủ dòng (Brand chỉ 707 dòng=2,12 tỷ vs raw 3,44 tỷ; Aff 1.441 dòng=3,48 tỷ vs raw 4,92 tỷ) → THIẾU **−1,32 tỷ (Brand) / −1,44 tỷ (Aff)** (làm HỤT). Cách sửa: export lại kỳ này theo từng tuần (file nhỏ không bị cắt) rồi upload lại.
   - Các file TUẦN (22/4 trở đi) ĐỦ 100% (file = raw). Vài tuần Aff lệch vài trăm nghìn — không đáng kể.
3. **Nút "Xoá upload" hỏng** (xoá theo `videos.created_at` ±30s) → bỏ sót metric của video cũ → sinh kỳ rác/“dòng ma”. Cách sửa: xoá theo `(period_start, period_end, source_type)`.
4. **(ĐÃ SỬA)** Thiếu guard tên file ↔ kỳ → đã thêm `parsePeriodFromFileName` chặn upload lệch kỳ.

> Muốn tổng ĐÚNG = TikTok Seller (Brand 5,12 tỷ / Aff 6,69 tỷ): cần **(1) xoá kỳ rác** + **(2) upload lại kỳ 22/1–21/4 đầy đủ theo tuần**. Hiện tại: brand DB ≈ 5,24 tỷ (vì +1,46 rác − 1,32 hụt ≈ gần khớp ngẫu nhiên).

### Fix Applied (1/3) — Guard tên file ↔ kỳ báo cáo
- **File:** `src/components/admin/UploadForm.tsx`
- Thêm `parsePeriodFromFileName()` (đọc `..._DD.MM.YY_DD.MM.YY.xlsx`) và chặn upload trong `handleFileUpload` khi:
  - tên file không chứa khoảng thời gian hợp lệ → lỗi, không upload;
  - kỳ trong tên file ≠ kỳ đã chọn → lỗi, không upload.
- **Test:** `scratch/test_filename_period.mjs` → 8/8 PASS. `tsc --noEmit` → exit 0.
- **Ngăn được:** kịch bản chọn kỳ `08–21/6` nhưng up file `08–14/6` (tạo kỳ rác chồng nhau).

### Audit toàn bộ kỳ ↔ file (đối chiếu video_id)
Đối chiếu 10 kỳ trong DB với nội dung file đúng khoảng thời gian:
- **9/10 kỳ: 100% khớp** → các lần upload chọn ĐÚNG kỳ.
- **1 kỳ LỆCH: `2026-02-03 → 2026-02-28`** — không có file trùng tên; dữ liệu khớp **94,8%** với file kỳ `22/04 → 03/05`. ⇒ Đúng **1 lần upload chọn sai kỳ** (chọn tháng 2 cho file dữ liệu ~22/04→03/05), tạo kỳ rác chồng lên `01-22→04-21` → đếm trùng 1,46 tỷ. Guard mới (Fix 1) sẽ chặn đúng loại lỗi này.

### Còn lại (chờ duyệt)
- (2) Sửa `DeleteLastUploadButton` xoá theo `(period_start, period_end, source_type)` thay vì `videos.created_at` (cần thêm 2 cột kỳ vào `upload_history` + ghi khi upload).
- (3) Dọn kỳ mồ côi `2026-02-03 → 2026-02-28` (1.144 dòng, đếm trùng 1,46 tỷ).

> ⚠️ **CẬP NHẬT QUAN TRỌNG (2026-06-22, sau khi kiểm tra file Excel thật):** Giả thuyết gốc ("file KOC chứa 1.316 video Brand / 117.358.453 ₫") là **SAI**. File `TikTok_Upload_Template_Aff_15.06.26_21.06.26.xlsx` **KHÔNG** lẫn dữ liệu kênh Brand (xem mục "Kiểm chứng file Excel"). ⇒ Bản fix đã deploy (lọc `BRAND_CREATORS` khỏi upload KOC) **không giải quyết nguyên nhân thật**; nó chỉ lọc 7 dòng GMV=0. Nguyên nhân thật nằm ở chỗ khác (1.316 metric kỳ 15–21 của video Brand được tạo lúc 07:59 — không khớp file nào tôi đọc được). **Số liệu cuối cùng vẫn ĐÚNG** (GMV Brand kỳ 15–21 = 120.862.181 = đúng file), không mất dữ liệu.

### Kiểm chứng file Excel `...Aff_15.06.26_21.06.26.xlsx`
- 5.034 dòng, tổng GMV 121.594.184 ₫.
- Theo `Người sáng tạo`: chỉ **7 dòng** thuộc kênh Brand (`decoco.accessories`), **GMV = 0 ₫**.
- Theo `Mã video`: **0/5.034** video_id trùng với file Brand kỳ này; tìm raw toàn bộ ô — brand-id **không xuất hiện** trong file KOC.
- Trong DB: 4.398/5.034 video_id của file KOC tồn tại, **tất cả đều `source_type='koc'`** (0 brand).
- ⇒ **File KOC SẠCH**, không lẫn dữ liệu Brand.

### Bí ẩn còn lại (cần Human hỗ trợ thông tin)
- 1.316 metric kỳ 15–21 của các video **Brand** có `created_at = 07:59:36–37` (cùng lúc upload KOC) mang sẵn GMV Brand; brand upload 08:39 chỉ tạo thêm **34** dòng mới (= 3.503.728 ₫ — đúng bằng mức tăng quan sát được).
- 5.714 dòng tạo lúc 07:59 = 4.398 (koc-file) + 1.316 (brand) → không khớp riêng file nào. Nghi do thao tác upload/re-upload trước đó mà `upload_history` không phản ánh đủ. Cần biết trình tự upload thực tế bạn đã làm cho kỳ 15–21.

## Bug Title
GMV Thương hiệu chỉ tăng 3.503.728 ₫ sau khi upload file Brand (kỳ 15–21/06), trong khi file Brand có GMV 120.862.181 ₫ → người dùng nghi ngờ mất số liệu.

## Bug Description
- Trước khi upload Brand: **5.241.744.274 ₫**
- Sau khi upload Brand: **5.245.248.002 ₫**
- Mức tăng thực tế: **3.503.728 ₫**
- GMV Brand trong file vừa upload: **120.862.181 ₫**
- Phần "thiếu": 120.862.181 − 3.503.728 = **117.358.453 ₫** (đúng bằng GMV video Brand lẫn trong file KOC ở báo cáo trước).

## Steps to Reproduce
1. Upload file **KOC** kỳ 15–21/06 (`...Aff_15.06.26_21.06.26.xlsx`) **trước**.
2. Xem tổng GMV Thương hiệu → đã bị tăng sẵn ~117 triệu.
3. Upload file **Brand** kỳ 15–21/06 (`...Brand_15.06.26_21.06.26.xlsx`) **sau**.
4. Tổng GMV Brand chỉ tăng thêm ~3,5 triệu thay vì ~120,8 triệu.

## Actual Result
Tổng GMV Brand chỉ tăng 3.503.728 ₫ sau khi upload Brand.

## Expected Result
Người dùng kỳ vọng tăng ~120.862.181 ₫.

## Context
- **Project DB thật**: `mrmwwlqolqsoyuxasrta` (khác với project HR `pmuxcbwxjczrzeigowoi` mà MCP đang kết nối → phải truy vấn trực tiếp bằng service-role key trong `.env.local`).
- **Thuộc tính nguồn (Brand/KOC)** được xác định bởi cột `videos.source_type` (1 giá trị/video), dùng trong RPC `get_videos_summary_for_period` (`v.source_type = p_source_type`).

---

## Root Cause Analysis

### Bằng chứng từ DB (truy vấn ngày 2026-06-22)

Lịch sử upload (giờ UTC):
```
15–21/06 : KOC 07:59  ->  BRAND 08:39   (KOC TRƯỚC Brand)   <-- kỳ đang xét
08–14/06 : BRAND 08:49 -> KOC 08:50      (KOC SAU Brand)
01–07/06 : BRAND 08:48 -> KOC 08:49      (KOC SAU Brand)
```

GMV Brand theo từng kỳ (tính server-side qua RPC, `source_type='brand'`):
```
15–21/06  brand_GMV = 120.862.181   <-- ĐÚNG BẰNG GMV file Brand
```

→ **Số liệu hiện tại ĐÚNG.** Tổng all-time Brand = 5.245.248.002 (= con số "sau upload").

### Vì sao mức tăng chỉ là 3,5 triệu (cơ chế)

`source_type` nằm trên bảng `videos` (1 giá trị/video). Các kênh chính chủ Brand (vd. `decoco.accessories`) là `source_type='brand'`, nhưng video của họ cũng xuất hiện trong file **KOC** (bán qua affiliate).

```
B1. Upload KOC (07:59) — TRƯỚC khi bản fix lọc được deploy
    -> tạo video_period_metrics kỳ 15–21 cho ~1.316 video Brand
    -> các video này source_type='brand' => CỘNG ~117,3tr vào GMV Brand
    => tổng "trước upload Brand" bị thổi lên = 5.241.744.274

B2. Upload Brand (08:39)
    -> upsert đè (onConflict video_id,period_start,period_end)
    -> GHI ĐÈ metrics ~1.316 video đó bằng giá trị Brand chính thức
    -> thêm 34 video mới
    => GMV Brand kỳ này = 120.862.181 (ĐÚNG)
    => mức TĂNG hiển thị = 120.862.181 − 117.358.453 = 3.503.728
```

ASCII:
```
GMV Brand kỳ 15–21:
  sau KOC (sai)   :  117.358.453   ──┐  (đã đếm trước)
  sau Brand (đúng):  120.862.181   ──┘  delta hiển thị = +3.503.728
```

→ **Không có dữ liệu bị mất.** "Chênh lệch" chỉ là phần đã bị đếm sớm ở bước KOC. Đây chính là lỗi đã mô tả & vá ở báo cáo trước (lọc `BRAND_CREATORS` khỏi upload KOC, commit `b6bac88`), nhưng file KOC kỳ 15–21 đã được upload **trước khi** bản fix được deploy.

### Rủi ro tồn dư (đáng lưu ý, KHÔNG phải lỗi của kỳ 15–21)
1. **Thiết kế `source_type` 1-giá-trị/video**: nguồn của một video do *lần upload cuối cùng* quyết định. Nếu upload KOC **sau** Brand (như kỳ 01–07 và 08–14), file KOC có thể (a) lật `source_type` của video Brand thành `koc`, và (b) ghi đè metrics Brand bằng giá trị affiliate → có thể làm lệch GMV các kỳ đó. Bản fix client chặn điều này về sau, nhưng **không dọn dữ liệu đã ghi trước đó**.
2. Hiện `decoco.accessories` có 17 video đang ở `source_type='koc'` (đã bị lật) — tác động nhỏ, cần xác nhận.

---

## Proposed Fixes

**Fix Option 0 (Khuyến nghị) — Không sửa code, chỉ xác minh & vận hành đúng quy trình:**
- Số liệu cuối của kỳ 15–21 đã đúng. Bản fix lọc `BRAND_CREATORS` (đã deploy) ngăn tái diễn.
- Để khẳng định fix hoạt động trên production: re-upload lại file **KOC** kỳ 15–21 (sau khi fix đã live) và xác nhận tổng GMV Brand **không** đổi (vì các dòng Brand bị bỏ qua).
- Quy trình khuyến nghị: luôn upload Brand trước, KOC sau (hoặc ngược lại đều an toàn khi fix đã live).

**Fix Option 1 (Tùy chọn) — Dọn dữ liệu các kỳ nghi ngờ:**
- Với kỳ 01–07 và 08–14 (KOC upload sau Brand): re-upload lại file **Brand** của 2 kỳ đó để ghi đè lại metrics + đặt lại `source_type='brand'`. Rủi ro thấp, dùng đúng công cụ sẵn có.

**Fix Option 2 (Lớn — chỉ nếu Human muốn) — Sửa tận gốc thiết kế attribution:**
- Gắn nguồn theo *dòng metric/kỳ* (vd. cột `source_type` trên `video_period_metrics`) hoặc đánh dấu kênh Brand bằng cờ DB, thay vì 1 cột `videos.source_type` bị lần upload cuối ghi đè. Đây là refactor, vượt phạm vi "minimal change".

## Verification Plan
- [x] Truy vấn DB: GMV Brand kỳ 15–21 = 120.862.181 (đúng bằng file). All-time Brand = 5.245.248.002 (đúng con số "sau upload").
- [ ] (Option 0) Re-upload KOC kỳ 15–21 trên production → kỳ vọng tổng GMV Brand giữ nguyên + thông báo "[Đã lọc bỏ N dòng thuộc kênh Brand]".
- [ ] (Option 1) Nếu chọn dọn dữ liệu: re-upload Brand kỳ 01–07 & 08–14, so sánh GMV trước/sau.

---

## Lịch sử Fix trước (đã hoàn thành)
- Commit `b6bac88` — `fix: exclude brand-owned channels from KOC/affiliate upload`: khi `sourceType==='koc'`, lọc bỏ các dòng có `creator_name ∈ BRAND_CREATORS` trước khi upsert. Test (`scratch/test_koc_filter.js`) PASS, `tsc --noEmit` exit 0. Đã push `main` → Vercel.
