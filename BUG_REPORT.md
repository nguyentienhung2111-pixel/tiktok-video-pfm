# Báo cáo Lỗi: Yêu cầu thêm bảng "Xếp hạng hiệu quả Content" cho trang KOC / Affiliate

## Trạng thái
ĐÃ SỬA — Thành công

## Kết quả Kiểm thử

### Thay đổi đã áp dụng (Phương án 1)
- Không cần migration mới — RPC `get_top_tags_by_group_leaderboard` đã có sẵn (đã chấp nhận `p_source_type`).
- **Frontend** — `src/app/(main)/team/booking/page.tsx`:
  - Thêm types `TagLbRow`, `TagLbEntry` và hằng `TAG_GROUP_TABS`.
  - State mới: `tagLeaderboard`, `activeTagTab`.
  - Trong `fetchData` gọi RPC song song với `p_source_type: 'koc'` (và toàn bộ filter date/product/min/search/tag/assigned_user đang dùng cho 2 leaderboard kia).
  - Grid Leaderboards: `lg:grid-cols-2` → `lg:grid-cols-3`.
  - Card mới: header + 3 tab (Format/Hook/Sound), Top-5 với progress bar tông tím (`text-purple-400`, `from-purple-500/70 to-purple-400`), số GMV + số video clip.
- **Test hồi quy**: `scratch/test_koc_tag_leaderboard.mjs` — gọi RPC, kiểm rank order, cross-check #1 Content Format trên KOC bằng cách quét lại video qua RPC `get_videos_with_period_metrics` với `p_tag_ids = [tag_id]`.

### Kết quả chạy test
```
RPC returned 13 rows (KOC source).
  Content Format: 5 tags, top = Couple     (2.354.614.108đ, 27 videos)
  Hook Style:     3 tags, top = Love       (2.399.256.453đ, 30 videos)
  Sound:          5 tags, top = Nhạc Việt  (2.324.014.236đ, 26 videos)
Direct sweep for "Couple" on KOC: 27 videos, 2.354.614.108đ
Filter inheritance (Linh Chi BOOKING): 8 rows
✅ PASS: KOC tag leaderboard returns correct top-N per requested group.
```

- **Cross-check:** Quét tay tag "Couple" trên source `koc` qua `get_videos_with_period_metrics` → **27 videos, 2.354.614.108đ** khớp 100% với RPC.
- **Filter inheritance:** Truyền `p_assigned_user_id` (Linh Chi BOOKING) thu hẹp kết quả xuống 8 dòng — chứng tỏ Card sẽ tự cập nhật khi user chọn nhân viên ở FilterBar.
- **Kết luận:** **Thành công ✅**

## Tiêu đề Lỗi
Trang KOC / Affiliate Performance (`/team/booking`) thiếu bảng xếp hạng "Xếp hạng hiệu quả Content" để phân tích hiệu suất theo nhóm tag như trang Thương hiệu.

## Mô tả Lỗi
Trang **KOC / Affiliate Performance** (`/team/booking`) hiện tại chỉ hiển thị 2 bảng xếp hạng: **TOP KOC / Affiliate** và **TOP Nhân viên Booking**. Để hỗ trợ tốt nhất cho công tác lập chiến dịch và tối ưu hóa content của các Booker, người dùng mong muốn bổ sung thêm bảng **Xếp hạng hiệu quả Content** (phân loại theo 3 nhóm tag chính: *Content Format*, *Hook Style*, *Sound*) giống hệt như trang Thương hiệu. 

Bảng xếp hạng mới này cần:
1. Tổng hợp doanh thu GMV và số lượng clips của các video KOC (`source_type = 'koc'`).
2. Tự động áp dụng và đồng bộ hoàn hảo theo các bộ lọc ngày tháng, sản phẩm, nhân viên booking và thanh tìm kiếm đang hoạt động trên trang.
3. Đồng bộ về mặt thẩm mỹ với tông màu Tím (Purple) chủ đạo của trang KOC / Affiliate để mang lại cảm giác premium và đồng nhất.

## Các bước tái hiện (Khảo sát hiện trạng)
1. Đăng nhập hệ thống và di chuyển tới trang **KOC / Affiliate** (`/team/booking`).
2. Quan sát phần các bảng xếp hạng (Leaderboards) ở giữa trang.
3. Hiện tại chỉ có 2 bảng xếp hạng (KOC và Nhân viên Booking). Khung phân tích hiệu quả kịch bản/âm thanh theo thẻ tag hoàn toàn vắng mặt.

## Kết quả Thực tế vs Kết quả Mong đợi
- **Kết quả Thực tế:** Chỉ hiển thị 2 bảng xếp hạng, Booker không có dữ liệu tổng hợp trực quan để biết dạng kịch bản hay âm thanh nào đang hiệu quả nhất đối với kênh KOC.
- **Kết quả Mong đợi:** Bổ sung bảng **Xếp hạng hiệu quả Content** bên cạnh 2 bảng hiện có, tạo thành lưới 3 cột cân đối trên màn hình lớn (`grid-cols-3`). Mỗi tag thuộc nhóm được chọn (Format/Hook/Sound) hiển thị:
  - Tên Tag (Ví dụ: *Unboxing*, *Mẫu CapCut*)
  - Tổng GMV do các KOC đạt được khi gắn tag này.
  - Số lượng video clips tương ứng của KOC.
  - Thanh tiến trình phần trăm màu tím biểu diễn tỷ lệ đóng góp doanh thu của tag so với tag dẫn đầu nhóm.

## Ngữ cảnh & Môi trường
- **Trang bị ảnh hưởng:** `/team/booking` (KOC / Affiliate Performance)
- **Tệp tin Frontend liên quan:** `src/app/(main)/team/booking/page.tsx`
- **Database dependencies:** RPC `get_top_tags_by_group_leaderboard` (Đã được tối ưu hóa ở SQL level và hỗ trợ đầy đủ tham số `p_source_type`).

---

## Phân tích Nguyên nhân Gốc rễ & Phương án thiết kế (Design Analysis)

Cơ sở dữ liệu của chúng ta đã có sẵn hàm RPC tổng hợp dữ liệu thẻ tag cực kỳ mạnh mẽ và tối ưu hiệu năng là `get_top_tags_by_group_leaderboard`. Tuy nhiên, trang `booking/page.tsx` hiện tại chưa liên kết với nó.

Để thực hiện tích hợp, ta cần sửa đổi file `booking/page.tsx` như sau:
1. Khai báo kiểu dữ liệu `TagLbEntry`, `TagLbRow`, và hằng số `TAG_GROUP_TABS` để định hình các nhóm tag Format, Hook, Sound.
2. Thiết lập 2 state variables: `tagLeaderboard` (lưu kết quả phân tích tag) và `activeTagTab` (lưu nhóm tab đang hiển thị).
3. Trong hàm `fetchData`, bổ sung lệnh gọi RPC `get_top_tags_by_group_leaderboard` vào khối `Promise.all` song song với các tham số lọc hiện hành: `p_source_type: 'koc'`.
4. Gom nhóm kết quả trả về từ database theo `group_name` và lưu vào state.
5. Thay đổi CSS lớp lưới hiển thị bảng xếp hạng từ `grid-cols-2` thành `grid-cols-1 lg:grid-cols-3 gap-6`.
6. Triển khai cấu trúc JSX render Card xếp hạng mới, sử dụng bảng màu tím (`bg-purple-500/15 text-purple-400 border-purple-500/30` và `from-purple-500/70 to-purple-400` cho progress bar) để phù hợp tuyệt đối với trang Booking.

### Sơ đồ cấu trúc layout đề xuất (Proposed Grid Layout on Desktop)

```ascii
 ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │   KOC / Affiliate Performance Dashboard                                                                │
 ├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │  [ GMV từ KOC ]            [ Đơn hàng KOC ]            [ Số KOC lên clip ]         [ Tổng lượt xem KOC ]  │
 ├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────────────────────────────────┐ │
 │ │ TOP KOC / AFFILIATE  │  │ TOP NHÂN VIÊN BOOKING│  │ XẾP HẠNG HIỆU QUẢ CONTENT                      │ │
 │ │ (Top 5 KOCs theo GMV)│  │ (Top 4 Booker theo   │  │ [ Format (Active) ]   [ Hook ]   [ Sound ]     │ │
 │ │                      │  │  GMV & KOCs quản lý) │  ├────────────────────────────────────────────────┤ │
 │ │                      │  │                      │  │ 1. Unboxing       2.4B đ (67 video clip)       │ │
 │ │                      │  │                      │  │ 2. Chi đẹp       604M đ (18 video clip)        │ │
 │ └──────────────────────┘  └──────────────────────┘  └────────────────────────────────────────────────┘ │
 └────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### Phương án 1: Tích hợp RPC Server-side Aggregation & Render Layout 3 Cột (Khuyến nghị)
- **Cách thực hiện:**
  - Tích hợp lời gọi `get_top_tags_by_group_leaderboard` trực tiếp vào `fetchData` của trang Booking, gửi kèm `p_source_type: 'koc'`.
  - Thay đổi cấu trúc Grid từ `grid-cols-2` thành `grid-cols-3` trên màn hình lớn.
  - Tạo Card xếp hạng động với style màu tím đặc trưng của KOC.
- **Ưu điểm:**
  - Dữ liệu đồng nhất và chính xác 100%, tự động kế thừa toàn bộ bộ lọc ngày tháng/sản phẩm/nhân viên booking của trang.
  - Tối ưu hóa hiệu năng cao nhờ xử lý gom nhóm hoàn toàn trên database PostgreSQL.
  - Trải nghiệm người dùng đồng nhất giữa 2 phân hệ Thương hiệu và Booking.

---

## Kế hoạch Xác minh

1. **Xác minh hiển thị:**
   - Sau khi áp dụng thay đổi, kiểm tra xem bảng xếp hạng thứ 3 "Xếp hạng hiệu quả Content" có hiển thị mượt mà trên cùng hàng với 2 bảng xếp hạng cũ hay không.
   - Click chuyển đổi qua lại giữa các tab Format, Hook, Sound để đảm bảo dữ liệu hiển thị chính xác theo từng nhóm tag.
2. **Xác minh số liệu chính xác:**
   - Đối chiếu số GMV và số lượng video clips của một tag bất kỳ trong bảng xếp hạng với kết quả khi lọc tìm kiếm theo tag đó ở bảng chi tiết video phía dưới. Số liệu phải khớp nhau hoàn toàn.
