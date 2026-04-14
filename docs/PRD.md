# Product Requirement Document (PRD)

# TikTok Video Performance — DECOCO

**Version:** 1.3  
**Ngày tạo:** 14/04/2026  
**Cập nhật:** 14/04/2026  
**Tác giả:** Nguyễn Tiến Hưng — Ecommerce & Marketing Manager  
**Trạng thái:** Final Draft

---

## Changelog

| Version | Ngày | Thay đổi |
|---|---|---|
| 1.0 | 14/04/2026 | Bản draft đầu tiên |
| 1.1 | 14/04/2026 | Bổ sung leaderboard NV Content, NV Booking gắn tag, export PNG, highlight, không phân biệt quyền xem, loại bỏ TikTok API |
| 1.2 | 14/04/2026 | NV Content cũng gắn tag, trang Tag Guideline, xử lý nhân viên nghỉ việc. Đóng toàn bộ câu hỏi mở |
| 1.3 | 14/04/2026 | **Thay đổi lớn:** (1) Phân cấp 3 tầng: Admin → Leader → Nhân viên. Mỗi team có Leader riêng. (2) Leader gắn tên nhân viên cho từng video thay vì dùng mapping tài khoản tĩnh. Leader cũng upload được file Excel. (3) Bổ sung nhiều cột vào bảng chi tiết video: ID Video, Nhân sự, Lượt tương tác, Người theo dõi mới, Đơn hàng, Tỷ lệ nhấp Video, Tỷ lệ xem hết video, Tỷ lệ nhấp đến đặt hàng, Chẩn đoán. Bảng có thanh trượt ngang. (4) Đổi nhãn "Kết nối" → "Thương hiệu" trong tab Team Content. (5) Text hiển thị trên 1 hàng (no wrap). |

---

## 1. Tổng quan sản phẩm

### 1.1 Tên sản phẩm
TikTok Video Performance DECOCO

### 1.2 Mô tả ngắn
Web app nội bộ giúp DECOCO theo dõi, phân tích và tối ưu hiệu suất video trên TikTok Shop — bao gồm cả video từ tài khoản thương hiệu (content in-house) và tài khoản liên kết (KOC/Affiliate). Hệ thống lưu trữ dữ liệu dài hạn từ file Excel xuất từ TikTok Seller Center, cho phép phân tích trend theo thời gian, phân loại content theo nhiều tiêu chí, và đánh giá hiệu suất theo từng nhân viên ở cả hai team.

### 1.3 Vấn đề cần giải quyết

TikTok Seller Center hiện tại có những hạn chế nghiêm trọng đối với việc quản lý content ở quy mô của DECOCO:

| Hạn chế của Seller Center | Hậu quả |
|---|---|
| Chỉ xem được dữ liệu 7 ngày hoặc 28 ngày, không lưu trữ lịch sử | Không so sánh được trend dài hạn, không biết content nào thực sự bền vững |
| Không phân loại được video theo dạng content | Không biết dạng content nào (hook, storytelling, đu trend...) đang hiệu quả |
| Không gộp được các SKU khác nhau của cùng 1 sản phẩm | Đánh giá sai hiệu suất sản phẩm, phân tán dữ liệu |
| Không đánh giá được performance theo nhân viên | Cả Team Content lẫn Team Booking đều không có cơ sở đánh giá ai đang làm tốt, ai cần hỗ trợ |
| Không có phân tích xu hướng và đề xuất tối ưu | Team Content chỉ "cảm nhận" thay vì ra quyết định dựa trên dữ liệu |
| Dữ liệu tài khoản thương hiệu và liên kết tách biệt, khó so sánh tổng thể | Thiếu bức tranh toàn cảnh về hiệu suất video toàn bộ hệ thống |

### 1.4 Quyết định thiết kế đã xác nhận

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Không tích hợp TikTok Shop API | Quá phức tạp, upload thủ công hàng tuần là đủ cho quy mô hiện tại |
| 2 | Export báo cáo chỉ ở định dạng hình ảnh (PNG) | Đơn giản, dễ chia sẻ nhanh qua Zalo/Telegram nội bộ |
| 3 | Highlight trực tiếp trên dashboard, không gửi notification | Không cần tích hợp bên ngoài, giảm độ phức tạp |
| 4 | Tất cả user đều xem được dashboard của cả 2 team | Minh bạch thông tin |
| 5 | Phân cấp 3 tầng: Admin → Leader → Nhân viên | Mỗi team có Leader riêng, Leader gắn nhân viên cho video + upload dữ liệu |
| 6 | Leader gắn tên nhân viên cho video thủ công | Linh hoạt hơn mapping tĩnh — 1 video có thể do nhiều người cùng làm, hoặc nhân viên thay đổi giữa kỳ |
| 7 | Nhãn "Thương hiệu" thay vì "Kết nối" trong tab Team Content | Dễ hiểu hơn cho nhân viên |

### 1.5 Quy ước thuật ngữ

| Thuật ngữ trong TikTok Seller Center | Thuật ngữ trong app | Giải thích |
|---|---|---|
| Tài khoản kết nối | Thương hiệu | Video từ tài khoản TikTok chính thức của DECOCO |
| Tài khoản liên kết | KOC / Affiliate | Video từ KOC/Affiliate liên kết với shop |

---

## 2. Đối tượng sử dụng

### 2.1 Người dùng mục tiêu

| Vai trò | Số lượng ước tính | Mục đích sử dụng chính |
|---|---|---|
| Admin (Manager) | 1 người | Quản lý tài khoản, phân quyền, quản lý product mapping, quản lý content tags, cấu hình hệ thống. Có toàn quyền |
| Leader Content | 1 người | Upload dữ liệu thương hiệu, gắn tên nhân viên Content cho video, gắn tag hàng loạt video thương hiệu, xem dashboard + leaderboard Team Content |
| Leader Booking | 1 người | Upload dữ liệu KOC, gắn tên nhân viên Booking cho video KOC, gắn tag hàng loạt video KOC, xem dashboard + leaderboard Team Booking |
| Nhân viên Content | 5–8 người | Xem dashboard, gắn tag cho video mình được gắn tên, xem performance cá nhân |
| Nhân viên Booking | 5–8 người | Xem dashboard, gắn tag cho video KOC mình được gắn tên, xem performance cá nhân |

---

## 3. Luồng dữ liệu

### 3.1 Nguồn dữ liệu đầu vào
Dữ liệu được export dưới dạng file Excel (.xlsx) từ TikTok Seller Center. Có 2 loại: "Thương hiệu" và "KOC / Affiliate".

### 3.2 Cấu trúc dữ liệu gốc (cột hiển thị trong app)

| # | Tên hiển thị | Mô tả |
|---|---|---|
| 1 | Creator | Tên nhà sáng tạo |
| 2 | ID Creator | Username TikTok |
| 3 | Video | Tiêu đề/caption video |
| 4 | ID Video | Mã định danh video (unique) |
| 5 | Ngày đăng | Ngày giờ đăng video |
| 6 | Sản phẩm | Sản phẩm gắn trên video |
| 7 | Views | Video Views |
| 8 | Lượt thích | Tổng lượt thích |
| 9 | Bình luận | Tổng bình luận |
| 10 | Lượt chia sẻ | Tổng lượt chia sẻ |
| 11 | Người theo dõi mới | Followers mới |
| 12 | Đơn hàng | Tổng đơn hàng |
| 13 | GPM | Doanh thu trên 1000 views |
| 14 | GMV | Doanh số quy về video |
| 15 | CTR | Tỷ lệ nhấp Video |
| 16 | Xem hết | Tỷ lệ xem hết video |
| 17 | Nhấp→Đặt | Tỷ lệ nhấp đến đặt hàng |
| 18 | Chẩn đoán | Nhận xét từ TikTok |
| 19 | Nhân sự | Nhân viên phụ trách (Leader gắn thủ công) |
| 20 | Tương tác | Tổng Thích + Bình luận + Chia sẻ |

---

## 4. Tính năng chi tiết

### 4.1 Hệ thống tài khoản & phân quyền
Phân cấp 3 tầng: Admin (Quản trị), Leader (Trưởng team), Nhân viên (Staff).

### 4.2 Dashboard tổng hợp (Trang chủ)
Hiển thị bức tranh toàn cảnh hiệu suất video.

### 4.3 Dashboard Team Content (Thương hiệu) & Team Booking (KOC)
- Bảng hiển thị thông tin chi tiết video.
- **Thanh trượt ngang**: Bảng có nhiều cột cần trượt ngang để xem hết.
- **Sticky columns**: Cột "Video", "Creator", "Nguồn" luôn được giữ cố định bên trái khi trượt.
- **Text hiển thị 1 hàng**: Không xuống hàng (nowrap), sử dụng dấu "..." nếu text quá dài.
- **Gắn nhân sự**: Leader chọn nhân viên phụ trách cho từng video.

### 4.4 Highlight & Export
- Tự động highlight dữ liệu viral/hiệu quả thấp.
- Export dashboard định dạng PNG.

---

## 5. Yêu cầu UI/UX (Dựa trên thiết kế DECOCO Onboarding)
- **Màu sắc**: Dark theme. Sử dụng Deep Purple, Navy, và các màu accent tím sáng.
- **Layout**: Sidebar bên trái, Header bên phải chứa thông tin user, Content area chứa dashboard.
- **Cards**: Bo góc lớn, shadow nhẹ, background gradient mờ ảo.
- **Table**: Hiển thị text 1 hàng, có sticky columns.

---
*Tài liệu này là bản v1.3 Final Draft.*
