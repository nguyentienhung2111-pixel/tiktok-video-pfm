# System Design Document

# TikTok Video Performance — DECOCO

**Version:** 1.0  
**Ngày tạo:** 14/04/2026  
**Trạng thái:** Draft

---

## 1. Kiến trúc hệ thống (High-Level Architecture)

Hệ thống được thiết kế theo mô hình **Client-Server** hiện đại, tối ưu cho việc hiển thị dashboard và xử lý dữ liệu bảng biểu lớn.

- **Frontend:** Next.js (React Framework) để đảm bảo tốc độ load trang nhanh, SEO tốt (nếu cần) và trải nghiệm người dùng mượt mà.
- **Backend-as-a-Service (BaaS):** Supabase (PostgreSQL + Auth + Storage). Giải pháp này giúp rút ngắn thời gian phát triển backend và quản trị database.
- **Xử lý dữ liệu:** Xử lý file Excel phía Client (thư viện `xlsx`) kết hợp với Edge Functions (Supabase) để validate và lưu trữ dữ liệu tập trung.
- **Hosting:** Vercel (Frontend) và Supabase Cloud (Database & Auth).

---

## 2. Sơ đồ thực thể (Data Schema)

### 2.1 Bảng Người dùng & Phân quyền (`profiles`)
Lưu trữ thông tin bổ sung cho hệ thống Auth của Supabase.
- `id`: UUID (Primary Key, liên kết với `auth.users`)
- `username`: String (Unique)
- `display_name`: String
- `role`: Enum ('admin', 'staff')
- `team`: Enum ('content', 'booking', 'both')
- `is_active`: Boolean (Mặc định: true)

### 2.2 Bảng Dữ liệu Video (`videos`)
Lưu trữ dữ liệu gộp từ file Excel. Phân biệt nguồn bằng trường `source_type`.
- `id`: UUID (PK)
- `video_id`: String (Unique - Mã từ TikTok)
- `creator_id`: String (ID nhà sáng tạo)
- `creator_name`: String
- `source_type`: Enum ('connected', 'affiliate')
- `published_at`: Datetime
- `raw_product_name`: String (Tên gốc từ TikTok)
- `master_product_id`: UUID (FK liên kết với `products`)
- **Metrics:** `views`, `likes`, `comments`, `shares`, `orders`, `gmv`, `gpm`, `ctr`, `completion_rate`, v.v.
- `uploaded_at`: Datetime
- `upload_batch_id`: UUID

### 2.3 Bảng Sản phẩm (`products` & `product_mappings`)
Giải quyết vấn đề gộp SKU.
- `products` (Sản phẩm gốc): `id`, `name`, `created_at`
- `product_mappings`: `id`, `master_product_id` (FK), `raw_name` (Unique)

### 2.4 Bảng Mapping Nhân sự (`creator_employee_mappings`)
- `id`: UUID
- `creator_id`: String (Mã TikTok)
- `employee_id`: UUID (FK -> `profiles`)
- `type`: Enum ('content', 'booking')
- `effective_from`: Date
- `effective_to`: Date (Nullable)

### 2.5 Bảng Phân loại Content (`tags` & `video_tags`)
- `tag_groups`: `id`, `name`
- `tags`: `id`, `group_id`, `name`, `short_desc`, `detailed_desc`
- `video_tags`: `video_id`, `tag_id`, `tagged_by`, `tagged_at`

---

## 3. Các thành phần kỹ thuật chính

### 3.1 Module Xử lý File (Excel Engine)
- Sử dụng thư viện `xlsx` (SheetJS) để đọc file `.xlsx`.
- **Luồng xử lý:**
    1. Client đọc file -> Chuyển thành JSON.
    2. Validate cấu trúc cột (so khớp với PRD mục 3.2).
    3. Kiểm tra trùng lặp (`video_id`) dựa trên dữ liệu hiện có.
    4. Batch Insert vào database Supabase thông qua REST API.

### 3.2 Hệ thống Highlight (Logic Engine)
- Sử dụng **Database Views** hoặc **Stored Procedures** trong PostgreSQL để tính toán các chỉ số Real-time (Trendviews, Top Performance).
- Ví dụ logic highlight Viral: `current_video_views > (avg_views_of_creator * 3.0)`.

### 3.3 Chụp báo cáo (Export Image)
- Sử dụng `html2canvas` hoặc `dom-to-image` để capture vùng DOM chứa dashboard.
- Tạo file PNG và kích hoạt download phía trình duyệt.

---

## 4. Bảo mật & Phân quyền (Security)

- **Row Level Security (RLS):** Thiết lập chính sách bảo mật ngay tại tầng database của Supabase.
    - Mọi người dùng (`authenticated`) có quyền READ tất cả dashboard.
    - Quyền INSERT/UPDATE/DELETE `videos` và `mapping` chỉ dành cho role `admin`.
    - Nhân viên chỉ được INSERT vào `video_tags` nếu `video_id` thuộc quyền quản lý của họ (check thông qua bảng `creator_employee_mappings`).

---

## 5. Quy trình phát triển (Development Workflow)

1. **Setup:** Khởi tạo Next.js App & Supabase Project.
2. **Database:** Tạo bảng, views, và thiết lập RLS rules.
3. **Core Logic:** Xây dựng tính năng Upload & Gắn tag.
4. **UI/UX:** Thiết kế Dashboard sử dụng Ant Design / Shadcn/UI tập trung vào tính tương tác của bảng biểu.
5. **Optimization:** Indexing các cột hay dùng để lọc (`creator_id`, `published_at`, `master_product_id`).
