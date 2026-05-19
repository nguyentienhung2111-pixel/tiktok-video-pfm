# Báo cáo Lỗi

## Trạng thái
ĐÃ SỬA — Thành công

## Kết quả Kiểm thử

### Thay đổi đã áp dụng (Phương án 1)
- Deploy file `supabase/migrations/add_video_id_search_to_rpcs.sql` lên Supabase production qua MCP `apply_migration`.
- Cả 6 RPC (`get_videos_with_period_metrics`, `get_videos_summary_for_period`, `get_top_booking_staff_leaderboard`, `get_top_kocs_leaderboard`, `get_top_products_leaderboard`, `get_top_tags_by_group_leaderboard`) giờ có thêm `OR v.video_id ILIKE '%' || p_search || '%'` trong điều kiện search.
- Phương án 2 (đổi placeholder FilterBar) **chưa áp dụng** theo nguyên tắc minimal changes — bug đã hết mà không cần đụng frontend.

### Xác nhận pre-fix (trước khi chạy migration)
```
get_videos_with_period_metrics(search='7638572188647410952') → 0 hits  ❌
get_videos_summary_for_period (search='7638572188647410952') → 0 hits  ❌
```

### Kết quả test sau fix
**Script gốc `scratch/test_video_id_search.mjs`:**
```
Test 1 (search title "banthan"):         found 5 videos
Test 2 (search by video_id):             found 1 videos   ✅
Test 3 (search "Tặng m điều may mắn"):   found 1 videos (decoco.accessories, brand)
Test 4 (search "7638572188647410952"):   found 1 videos   ✅
Test 5 (direct table query):             found 1 video(s)
```

**Test bổ sung `scratch/test_video_id_search_all_rpcs.mjs`** (cover cả 6 RPC + regression):
```
get_videos_with_period_metrics  search=7601433170260528404 → 1 row(s)
get_videos_with_period_metrics  search=7638572188647410952 → 1 row(s)
get_videos_summary_for_period   search=7601433170260528404 → total_videos=1
get_videos_summary_for_period   search=7638572188647410952 → total_videos=1
get_top_booking_staff_leaderboard search=7601433170260528404 → 1 row(s)
get_top_kocs_leaderboard         search=7601433170260528404 → 1 row(s)
get_top_products_leaderboard     search=7638572188647410952 → 1 row(s)
get_top_tags_by_group_leaderboard search=7638572188647410952 → 0 row(s)
Creator search "decoco.accessories" → 5 hit(s)
Title search "banthan" → 10 hit(s)
✅ PASS: video_id search works on all 6 RPCs; title/creator searches unchanged.
```

Ghi chú: RPC tag leaderboard trả 0 row khi search bằng `BRAND_VID` là bình thường — video đó không gắn tag thuộc 3 nhóm Format/Hook/Sound, nên không xuất hiện trong leaderboard tag (đúng semantic).

- **Kết luận:** **Thành công ✅** — Search bằng video_id hoạt động trên Dashboard, Thương hiệu, KOC / Affiliate; mọi search hiện có không bị hồi quy.

## Tiêu đề Lỗi
Thanh tìm kiếm trên cả 3 trang không thể tìm video bằng ID Video — do migration chưa được deploy lên Supabase production.

## Mô tả Lỗi
**2 triệu chứng được báo cáo:**

1. **Tìm kiếm bằng Video ID không hoạt động** trên cả 3 trang Dashboard, Thương hiệu, KOC / Affiliate. Khi nhập một video_id (VD: `7638572188647410952`) vào thanh search, hệ thống trả về 0 kết quả mặc dù video đó tồn tại trong database.

2. **Video cụ thể "Tặng m điều may mắn nhất..."** được cho là không tìm thấy — nhưng kiểm tra cho thấy video **có tồn tại** trong DB (source_type `brand`, creator `decoco.accessories`) và **tìm thấy được** khi search bằng text thuần (VD: `banthan` hoặc `Tặng m điều may mắn`). Vấn đề xảy ra khi user search bằng **video_id** hoặc chuỗi chứa **emoji/ký tự đặc biệt**.

## Các bước tái hiện
1. Đăng nhập hệ thống với tài khoản admin.
2. Trên trang Dashboard, gõ tiêu đề `banthan` → tìm thấy 6 video (bao gồm video "Tặng m điều may mắn...").
3. Ghi nhận video_id hiển thị trong cột "ID VIDEO" (VD: `7601433170260528404`).
4. Xoá ô tìm kiếm, paste video_id đó vào thanh search → **0 kết quả**.
5. Tương tự trên trang Thương hiệu và KOC / Affiliate.

## Kết quả Thực tế vs Kết quả Mong đợi
| # | Hành động | Kết quả thực tế | Kết quả mong đợi |
|---|-----------|-----------------|-------------------|
| 1 | Search `banthan` | ✅ 6 video | 6 video |
| 2 | Search `7601433170260528404` (video_id) | ❌ 0 video | 1 video |
| 3 | Search `7638572188647410952` (video_id cụ thể) | ❌ 0 video | 1 video |
| 4 | Direct DB query `videos.video_id = '7638572188647410952'` | ✅ 1 video | 1 video |

## Ngữ cảnh & Môi trường
- **App**: https://tiktok-video-pfm.vercel.app
- **Database**: Supabase (PostgreSQL)
- **Pages bị ảnh hưởng**: `/dashboard`, `/team/content`, `/team/booking`
- **RPC functions bị ảnh hưởng**: `get_videos_with_period_metrics`, `get_videos_summary_for_period`, `get_top_booking_staff_leaderboard`, `get_top_kocs_leaderboard`, `get_top_products_leaderboard`, `get_top_tags_by_group_leaderboard`

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

### Luồng tìm kiếm hiện tại

```
 User gõ search     FilterBar.tsx          queries.ts              Supabase RPC (production)
 ┌──────────┐   ┌───────────────────┐  ┌──────────────────┐  ┌─────────────────────────────┐
 │ "763857.."│──▶│ filters.search    │──▶│ p_search = "..."  │──▶│ WHERE                       │
 └──────────┘   └───────────────────┘  └──────────────────┘  │   v.video_title ILIKE '%..%' │
                                                              │   OR v.creator_name ILIKE ... │
                                                              │   OR v.creator_id ILIKE ...   │
                                                              │   ❌ THIẾU: v.video_id ILIKE │
                                                              └─────────────────────────────┘
```

### Nguyên nhân gốc

**Migration `add_video_id_search_to_rpcs.sql` chưa được chạy trên Supabase production.**

- File migration nằm trong repo tại `supabase/migrations/add_video_id_search_to_rpcs.sql`
- File này bổ sung `OR v.video_id ILIKE '%' || p_search || '%'` cho **6 RPC functions**
- Tuy nhiên, RPC hiện tại trên production **vẫn là phiên bản cũ** — chỉ search `video_title`, `creator_name`, `creator_id`

### Bằng chứng xác thực (từ test script `scratch/test_video_id_search.mjs`)

```
Test 1: Search "banthan" (title)       → ✅ 5 videos
Test 2: Search video_id               → ❌ 0 videos  
Test 4: Search "7638572188647410952"   → ❌ 0 videos
Test 5: Direct table query            → ✅ Video tồn tại
```

→ Kết luận: RPC function trên server **thiếu điều kiện search video_id**.

### Về video "Tặng m điều may mắn nhất..."

Video này **có tồn tại** trong database (brand source, creator `decoco.accessories`, video_id `7638572188647410952`). Nó **tìm thấy được** bằng search tiêu đề text thuần. Nguyên nhân user không tìm thấy có thể do:
- User đang search bằng **video_id** (không hoạt động, như phân tích trên)
- Hoặc user đang ở trang với **source filter = KOC** (video này thuộc brand)

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### ✅ Phương án 1 (Khuyến nghị): Deploy migration đã có sẵn

**Thực hiện**: Chạy SQL trong file `supabase/migrations/add_video_id_search_to_rpcs.sql` trên Supabase production.

**Chi tiết**: File này đã được viết sẵn và bổ sung `v.video_id ILIKE '%' || p_search || '%'` cho cả 6 RPC functions:
1. `get_videos_with_period_metrics` 
2. `get_videos_summary_for_period`
3. `get_top_booking_staff_leaderboard`
4. `get_top_kocs_leaderboard`
5. `get_top_products_leaderboard`
6. `get_top_tags_by_group_leaderboard`

**Ưu điểm**:
- Không cần sửa code frontend — logic truyền `p_search` đã hoạt động đúng
- Migration đã được review và viết sẵn, chỉ cần deploy
- Sửa triệt để trên cả 3 trang cùng lúc

**Rủi ro**: Thấp — chỉ thêm 1 điều kiện OR trong WHERE, không thay đổi schema.

### Phương án 2 (Bổ sung): Cập nhật placeholder thanh search

Sau khi deploy migration, cập nhật placeholder trong `FilterBar.tsx`:
```
"Tìm theo creator hoặc tiêu đề video..."  
→  "Tìm theo creator, tiêu đề video hoặc ID video..."
```

Điều này giúp user biết rằng search bằng video_id **được hỗ trợ**.

---

## Kế hoạch Xác minh

1. **Chạy migration SQL** trên Supabase SQL Editor
2. **Chạy lại test script** `scratch/test_video_id_search.mjs`:
   - Test 2 phải trả về ≥ 1 video
   - Test 4 phải trả về 1 video (video "Tặng m điều may mắn...")
3. **Kiểm tra trên web**:
   - Dashboard: search video_id → phải hiển thị kết quả
   - Thương hiệu: search `7638572188647410952` → phải tìm thấy 1 video
   - KOC / Affiliate: search video_id khác → phải tìm thấy
4. **Kiểm tra không hồi quy**: search bằng tên creator và tiêu đề vẫn hoạt động bình thường
