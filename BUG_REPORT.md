# Báo cáo Lỗi: Khung "Xếp hạng Hiệu quả Content" trống rỗng (giao diện tĩnh)

## Trạng thái
ĐÃ SỬA — Thành công

## Kết quả Kiểm thử

### Điều chỉnh so với kế hoạch ban đầu
Phương án 1 của report đề xuất gom nhóm client-side trên mảng `leaderboardVideos` (lời gọi `fetchVideosWithMetrics({ limit: 5000 })`).
Mẫu này chính là root cause của bug "Linh Chi BOOKING" vừa sửa: PostgREST cắt cứng phản hồi ở `max_rows = 1000`. Brand source hiện đã có **1537 videos**, nên tổng GMV/số video cho các tag thấp hơn top-1000 sẽ bị truncate âm thầm.
Vì vậy đã chuyển sang **server-side aggregation** (cùng pattern với booking leaderboards), thay vì hi sinh tính đúng đắn.

### Thay đổi đã áp dụng
1. **Database migration** — `supabase/migrations/create_tag_leaderboard_rpc.sql` (đã apply lên Supabase):
   - `get_top_tags_by_group_leaderboard(...)` với đủ filter (period, source_type, product_id, min_gmv, min_views, search, tag_ids, assigned_user_id) + 2 tham số riêng `p_groups TEXT[]` và `p_limit_per_group INT`.
   - GROUP BY `(group_name, tag_id, tag_name)`, `SUM(gmv)`, `COUNT(DISTINCT video.id)`. Top-N mỗi group qua `ROW_NUMBER() OVER (PARTITION BY group_name ORDER BY total_gmv DESC, tag_name ASC)`.
2. **Frontend** — `src/app/(main)/team/content/page.tsx`:
   - Bổ sung state `tagLeaderboard: Record<group, TagLbEntry[]>` và `activeTagTab`.
   - Trong `fetchData` chạy song song RPC mới với các call hiện có.
   - Thay placeholder Card bằng Card động: tiêu đề, 3 tab (Format / Hook / Sound), Top-5 với progress bar (% so với tag đứng đầu trong group), GMV + số video clip.
3. **Test hồi quy**: `scratch/test_tag_leaderboard.mjs`.

### Kết quả chạy test
```
RPC returned 15 rows.
  Content Format: 5 tags, top = Viral Hook (2.451.369.629đ, 67 videos)
  Hook Style: 5 tags, top = Love (2.799.098.740đ, 172 videos)
  Sound: 5 tags, top = Nhạc ngoại (1.391.828.329đ, 37 videos)
Cross-check: tag "Love" → 172 brand video links (RPC said 172)
✅ PASS: Tag leaderboard RPC returns correct top-N per requested group.
```

- **Cross-check:** Số video gắn tag "Love" (Hook Style, brand source) đếm độc lập qua `video_tags` join = **172** — khớp tuyệt đối với RPC.
- **Đúng đắn ở mọi quy mô:** Aggregation nằm trong SQL nên 1500+ video brand không còn nguy cơ truncate. Card cũng tự thừa hưởng đủ filter của trang (date range, product, min_gmv, search, tag filter).
- **Kết luận:** **Thành công ✅**

> Lưu ý out-of-scope: trang `/team/content` còn dùng `fetchVideosWithMetrics({ limit: 5000 })` để feed Card "TOP Sản phẩm (Brand)". Brand đã có 1537 video > cap 1000 nên Card đó có nguy cơ thiếu hụt số liệu tương tự bug Linh Chi. Lần này chưa đụng vì user yêu cầu minimal changes — có thể tạo bug report riêng để fix sau theo cùng pattern.

## Tiêu đề Lỗi
Khung "Xếp hạng Hiệu quả Content" trên trang Thương hiệu (`/team/content`) chỉ là giao diện tĩnh (placeholder) và chưa hiển thị xếp hạng thực tế theo các nhóm tag.

## Mô tả Lỗi
Tại trang hiệu suất video Thương hiệu (`/team/content`), khung **Xếp hạng Hiệu quả Content** bên cạnh bảng **TOP SẢN PHẨM (BRAND)** hiện tại đang trống rỗng. Khung này chỉ hiển thị một biểu tượng giỏ hàng và đoạn văn bản mô tả tĩnh: *"Phân tích sâu về các kịch bản và format video mang lại chuyển đổi cao nhất."*

Người dùng mong muốn khung này trở thành một bảng xếp hạng động (Leaderboard) thực tế, giúp phân tích hiệu quả hoạt động của các kịch bản video (đo bằng tổng GMV và số lượng video clip) được phân loại và lọc theo 3 nhóm tag chính có trong cơ sở dữ liệu:
1. **Content Format** (Định dạng nội dung: Unboxing, Mix&Match, Couple,...)
2. **Hook Style** (Kiểu hook mở đầu: Love, Healing, Visual Hook,...)
3. **Sound** (Âm thanh/Nhạc nền: Lồng tiếng, Nhạc Việt, Podcast,...)

## Các bước tái hiện
1. Đăng nhập hệ thống và truy cập vào trang **Thương hiệu (DECOCO Official)** (`/team/content`).
2. Quan sát khung bên cạnh mục **TOP SẢN PHẨM (BRAND)** ở giữa trang.
3. Nhận thấy khung **Xếp hạng Hiệu quả Content** hoàn toàn tĩnh và không hiển thị bất kỳ bảng xếp hạng hay dữ liệu tương tác nào.

## Kết quả Thực tế vs Kết quả Mong đợi
- **Kết quả Thực tế:** Khung hiển thị giao diện tĩnh (placeholder) trống rỗng với biểu tượng giỏ hàng, không có dữ liệu thực tế hay nút tương tác.
- **Kết quả Mong đợi:** Hiển thị một bảng xếp hạng động (Leaderboard) gồm Top 5 tag đạt GMV cao nhất, đi kèm bộ nút tab chuyển đổi linh hoạt giữa 3 nhóm tag: **Format** (Content Format), **Hook** (Hook Style), và **Sound** (Sound). Mỗi tag hiển thị:
  - Tên Tag (Ví dụ: *Unboxing*, *Nhạc Việt*)
  - Tổng GMV thu được từ các video gắn tag này trong kỳ.
  - Số lượng video clips tương ứng được gắn tag (Ví dụ: *108 video clip*).
  - Thanh tiến trình trực quan biểu thị phần trăm đóng góp GMV của tag so với tag đứng đầu.

## Ngữ cảnh & Môi trường
- **Trang bị ảnh hưởng:** `/team/content` (Thương hiệu/Brand)
- **Tệp tin liên quan:** `src/app/(main)/team/content/page.tsx`
- **Cơ sở dữ liệu:** Các bảng `tag_groups`, `tags`, `video_tags` và `videos`.

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

Tệp tin `src/app/(main)/team/content/page.tsx` hiện tại chứa một component Card cứng (placeholder) từ dòng 199 - 207:
```typescript
<Card className="border-[#30363d] bg-[#161b22] overflow-hidden">
  <CardContent className="flex flex-col items-center justify-center p-12 text-center h-full gap-4">
    <ShoppingBag className="w-12 h-12 text-primary/40" />
    <div>
      <p className="font-bold text-white">Xếp hạng Hiệu quả Content</p>
      <p className="text-xs text-muted-foreground mt-1">Phân tích sâu về các kịch bản và format video mang lại chuyển đổi cao nhất.</p>
    </div>
  </CardContent>
</Card>
```
Hệ thống chưa xây dựng logic:
1. Tải danh mục thẻ tag và các nhóm liên kết (`tags` và `tag_groups`) từ Supabase về client.
2. Duyệt qua mảng video clips đã được lọc (`leaderboardVideos`) để tích lũy doanh thu GMV và đếm số lượng video tương ứng cho từng thẻ tag.
3. Gom nhóm kết quả phân tích theo 3 nhóm tag: **Content Format**, **Hook Style**, **Sound**.
4. Giao diện Tabs và thanh tiến trình động để người dùng chuyển đổi và theo dõi.

### Sơ đồ luồng xử lý và dữ liệu đề xuất (Proposed Data Flow)

```ascii
 [leaderboardVideos] (Danh sách video đã được lọc theo ngày/sản phẩm)
       │
       ├─────────────────────────────────────────┐
       ▼                                         ▼
 [Tải danh mục Tags từ DB] (tags + tag_groups)  [Gom nhóm & Tích lũy]
  - Map: Tag Name (lowercase) -> Group Name      - Duyệt qua từng clip
                                                 - Với mỗi tag trong clip:
                                                    - Tra cứu Group từ Map
                                                    - Cộng dồn GMV & Tăng count
                                                     cho tag thuộc Group đó
                                                 │
                                                 ▼ Sắp xếp GMV giảm dần & lấy Top 5
                                         [Bộ Leaderboards theo Group]
                                                 │
                                                 ▼ Render UI theo activeTab
 ┌────────────────────────────────────────────────────────────────────────┐
 │   XẾP HẠNG HIỆU QUẢ CONTENT                                            │
 │   [ Format (Active) ]   [ Hook ]   [ Sound ]                           │
 ├────────────────────────────────────────────────────────────────────────┤
 │ 🥇 Unboxing                 1.603.301.032 đ   (108 video clip)         │
 │ 🥈 Mix&Match                  533.456.216 đ   (42 video clip)          │
 │ 🥉 Couple                     214.770.440 đ   (10 video clip)          │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### Phương án 1: Tính toán gom nhóm trực tiếp tại Frontend (Client-side Aggregation) - *Khuyến nghị*

Tận dụng mảng dữ liệu `leaderboardVideos` sẵn có của trang (mảng này đã được lọc chính xác theo khoảng thời gian và sản phẩm được chọn trên thanh bộ lọc):
1. **Frontend (`fetchData`):**
   - Tải thêm danh sách tag kèm nhóm tag tương ứng từ database:
     ```typescript
     const [summaryResult, leaderboardResult, tableResult, usersResult, tagsResult] = await Promise.all([
       fetchVideosSummary(baseParams),
       fetchVideosWithMetrics({ ...baseParams, limit: 5000, offset: 0 }),
       fetchVideosWithMetrics({ ...baseParams, limit: pageSize, offset: (page - 1) * pageSize }),
       supabase.from('profiles').select('*').eq('is_active', true),
       supabase.from('tags').select('name, tag_groups(name)'), // Tải tag-group mapping
     ]);
     ```
   - Lưu trữ danh mục này vào một state `tags` của page.
2. **Frontend (Logic Gom nhóm):**
   - Xây dựng hàm `useMemo` có tên `contentLeaderboards` để tính toán số liệu thống kê (GMV, số video) cho từng tag và phân loại chúng vào 3 nhóm tag đích.
   - Sắp xếp thứ tự các tag trong mỗi nhóm theo tổng GMV giảm dần và cắt lấy Top 5.
3. **Frontend (UI Card):**
   - Thay thế thẻ Card tĩnh hiện tại bằng một Card động có tiêu đề, bộ chọn Tab chứa 3 nhóm: **Format** (Content Format), **Hook** (Hook Style), và **Sound** (Sound).
   - Duyệt qua Top 5 tag của nhóm đang hoạt động và hiển thị dưới dạng các dòng có thanh tiến trình (progress bar) trực quan và đẹp mắt.

- **Ưu điểm:**
  - Cực kỳ đơn giản, trực quan, không cần tạo thêm RPC mới hay chỉnh sửa cấu trúc database.
  - Tự động thừa hưởng toàn bộ các bộ lọc thời gian, sản phẩm của trang một cách hoàn hảo nhờ dùng chung dữ liệu `leaderboardVideos` đã được lọc.
  - Hiệu năng rất cao vì tính toán trực tiếp trên RAM phía Client.

---

## Kế hoạch Xác minh

1. **Xác minh hiển thị:**
   - Sau khi áp dụng sửa đổi, kiểm tra xem Card **Xếp hạng Hiệu quả Content** có hiển thị các tab: **Format**, **Hook**, **Sound** hay không.
   - Click chuyển đổi qua lại giữa các tab để đảm bảo giao diện thay đổi mượt mà và hiển thị đúng các tag thuộc nhóm tương ứng (ví dụ: tab *Sound* phải hiển thị *Lồng tiếng*, *Nhạc Việt*,...).
2. **Xác minh tính chính xác của số liệu:**
   - So sánh chéo tổng GMV của một tag (ví dụ: *Unboxing*) trên bảng xếp hạng với kết quả khi lọc tìm kiếm thủ công tag đó trong bảng chi tiết video. Số liệu GMV và số video clip phải hoàn toàn trùng khớp.
