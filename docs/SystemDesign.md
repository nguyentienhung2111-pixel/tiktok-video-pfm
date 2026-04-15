# System Design Document

# TikTok Video Performance — DECOCO

**Version:** 2.0  
**Ngày tạo:** 15/04/2026  
**PRD tham chiếu:** v1.3 (14/04/2026)  
**Trạng thái:** Final

---

## Changelog

| Version | Ngày | Thay đổi |
|---|---|---|
| 1.0 | 14/04/2026 | Bản đầu tiên — 2 role (admin/staff), mapping tĩnh creator→employee, 2 bảng video riêng |
| 2.0 | 15/04/2026 | **Viết lại hoàn toàn** theo PRD v1.3: 5 role (admin/leader_content/leader_booking/staff_content/staff_booking), Leader gắn nhân sự thủ công cho video, gộp 1 bảng `videos`, loại bỏ `creator_employee_mappings`, bổ sung đầy đủ cột video, đổi source_type thành brand/koc |

---

## 1. Kiến trúc hệ thống

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│              Next.js (App Router)                 │
│           Deploy: Vercel                         │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Dashboard │ │ Team     │ │ Admin Panel      │  │
│  │ Tổng hợp │ │ Content  │ │ (Upload, Quản lý │  │
│  │          │ │ + Booking│ │  tài khoản, Tags) │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
│                                                   │
│  Libs: Tailwind CSS, shadcn/ui, Recharts,        │
│        xlsx (SheetJS), html2canvas                │
└─────────────────┬───────────────────────────────┘
                  │ Supabase JS Client (REST + Realtime)
                  ▼
┌─────────────────────────────────────────────────┐
│                   BACKEND                        │
│          Supabase (Singapore Region)             │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Auth     │ │ Database │ │ Storage          │  │
│  │ (JWT)    │ │ Postgres │ │ (nếu cần sau)    │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
│                                                   │
│  Security: Row Level Security (RLS)              │
│  Region: ap-southeast-1 (Singapore)              │
└─────────────────────────────────────────────────┘
```

### 1.2 Tech Stack

| Layer | Công nghệ | Ghi chú |
|---|---|---|
| Frontend Framework | Next.js 14+ (App Router) | Server Components + Client Components |
| UI Library | Tailwind CSS + shadcn/ui | Dark theme, Table component với sticky columns + horizontal scroll |
| Charts | Recharts | Biểu đồ đường, cột, tròn |
| Excel Processing | xlsx (SheetJS) | Parse file .xlsx phía client |
| Screenshot | html2canvas | Chụp dashboard thành PNG |
| Backend | Supabase | PostgreSQL + Auth + RLS |
| Hosting | Vercel (frontend) + Supabase Cloud (backend) | Auto-deploy từ Git |

---

## 2. Database Schema

### 2.1 Bảng `profiles` (Người dùng)

Liên kết 1:1 với `auth.users` của Supabase.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'admin',
    'leader_content',
    'leader_booking',
    'staff_content',
    'staff_booking'
  )),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Ghi chú quan trọng:**
- **5 role** thay vì 2 (khác với System Design v1.0)
- **KHÔNG CÓ trường `team`** — role đã bao gồm thông tin team (leader_content = team content, staff_booking = team booking)
- Admin có toàn quyền, Leader có quyền upload + gắn nhân sự + gắn tag hàng loạt cho team mình

### 2.2 Bảng `videos` (Dữ liệu video — 1 bảng duy nhất)

Gộp tất cả video (thương hiệu + KOC) vào 1 bảng, phân biệt bằng `source_type`.

```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Định danh & phân loại
  video_id TEXT UNIQUE NOT NULL,           -- Mã video từ TikTok (dùng để chống trùng)
  source_type TEXT NOT NULL CHECK (source_type IN ('brand', 'koc')),
                                            -- 'brand' = Thương hiệu, 'koc' = KOC/Affiliate

  -- Thông tin creator
  creator_name TEXT,                        -- Tên nhà sáng tạo
  creator_id TEXT,                          -- ID nhà sáng tạo TikTok

  -- Thông tin video
  video_title TEXT,                         -- Tiêu đề/caption
  published_at TIMESTAMPTZ,                 -- Ngày đăng
  raw_product_name TEXT,                    -- Tên sản phẩm gốc từ Excel
  master_product_id UUID REFERENCES products(id), -- FK → sản phẩm gốc (sau mapping)

  -- Metrics gốc từ Excel (LƯU TẤT CẢ 25 CỘT)
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  new_followers BIGINT DEFAULT 0,
  view_to_like_clicks BIGINT DEFAULT 0,
  product_impressions BIGINT DEFAULT 0,
  product_clicks BIGINT DEFAULT 0,
  unique_buyers BIGINT DEFAULT 0,
  orders BIGINT DEFAULT 0,
  items_sold BIGINT DEFAULT 0,
  total_merchandise_value BIGINT DEFAULT 0, -- VND, lưu số nguyên
  gpm BIGINT DEFAULT 0,                     -- VND
  gmv BIGINT DEFAULT 0,                     -- VND
  ctr DECIMAL(5,2) DEFAULT 0,               -- %
  view_to_like_rate DECIMAL(5,2) DEFAULT 0,  -- %
  completion_rate DECIMAL(5,2) DEFAULT 0,    -- %
  click_to_order_rate DECIMAL(5,2) DEFAULT 0,-- %
  diagnosis TEXT,                             -- Chẩn đoán từ TikTok

  -- Trường tính toán
  engagement BIGINT GENERATED ALWAYS AS (likes + comments + shares) STORED,

  -- Gắn nhân sự (Leader gắn thủ công — THAY THẾ mapping tĩnh)
  assigned_user_id UUID REFERENCES profiles(id),  -- NV phụ trách
  assigned_by UUID REFERENCES profiles(id),        -- Leader/Admin đã gắn
  assigned_at TIMESTAMPTZ,

  -- Metadata upload
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  upload_batch_id UUID
);

-- Indexes cho performance
CREATE INDEX idx_videos_source_type ON videos(source_type);
CREATE INDEX idx_videos_published_at ON videos(published_at);
CREATE INDEX idx_videos_assigned_user_id ON videos(assigned_user_id);
CREATE INDEX idx_videos_creator_id ON videos(creator_id);
CREATE INDEX idx_videos_master_product_id ON videos(master_product_id);
CREATE INDEX idx_videos_upload_batch_id ON videos(upload_batch_id);
```

**Khác biệt quan trọng so với System Design v1.0:**
- **1 bảng `videos`** thay vì 2 bảng riêng (video_connected + video_affiliate)
- **`source_type`** = 'brand' hoặc 'koc' (KHÔNG phải 'connected'/'affiliate')
- **`assigned_user_id`** thay thế hoàn toàn bảng `creator_employee_mappings`
- **`engagement`** = computed column (likes + comments + shares)
- **Lưu tất cả 25 cột** từ file Excel, không bỏ sót cột nào
- Tiền tệ (VND) lưu dạng BIGINT (số nguyên) để tránh lỗi floating point

### 2.3 Bảng `products` & `product_sku_mappings`

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE product_sku_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  raw_product_name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.4 Bảng Tags

```sql
CREATE TABLE tag_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES tag_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_description TEXT,          -- Hiển thị tooltip
  detailed_description TEXT,       -- Hiển thị trang Guideline (rich text)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, name)
);

CREATE TABLE video_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  tagged_by UUID NOT NULL REFERENCES profiles(id),
  tagged_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(video_id, tag_id)
);
```

### 2.5 Bảng `tag_guideline`

```sql
CREATE TABLE tag_guideline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT,                      -- Rich text HTML
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.6 Bảng `upload_history`

```sql
CREATE TABLE upload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('brand', 'koc')),
  records_count INTEGER DEFAULT 0,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'success'
);
```

### 2.7 Bảng `highlight_rules`

```sql
CREATE TABLE highlight_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  threshold_value DECIMAL NOT NULL,
  threshold_unit TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.8 ERD tóm tắt

```
profiles (users)
  ├── videos.assigned_user_id (Leader gắn NV cho video)
  ├── videos.assigned_by
  ├── video_tags.tagged_by
  └── upload_history.uploaded_by

videos
  ├── video_tags (many-to-many với tags)
  └── products (via master_product_id)

products
  └── product_sku_mappings

tag_groups
  └── tags
      └── video_tags
```

---

## 3. Phân quyền & Row Level Security (RLS)

### 3.1 Ma trận quyền

| Bảng | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | Tất cả authenticated | Admin only | Admin (tất cả), User (chỉ mình — đổi password) | Admin only (soft delete via is_active) |
| videos | Tất cả authenticated | Admin + Leader | Admin (tất cả), Leader Content (assigned_user_id video brand), Leader Booking (assigned_user_id video koc) | Admin only |
| video_tags | Tất cả authenticated | Admin + Leader (hàng loạt) + NV (video mình được assign) | Admin + Leader team mình | Admin + Leader team mình |
| products, product_sku_mappings | Tất cả authenticated | Admin only | Admin only | Admin only |
| tag_groups, tags | Tất cả authenticated | Admin only | Admin only | Admin only |
| tag_guideline | Tất cả authenticated | Admin only | Admin only | — |
| upload_history | Tất cả authenticated | Admin + Leader | — | — |
| highlight_rules | Tất cả authenticated | Admin only | Admin only | Admin only |

### 3.2 RLS Policies (SQL)

```sql
-- Bật RLS cho tất cả bảng
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_tags ENABLE ROW LEVEL SECURITY;
-- ... (tương tự cho tất cả bảng)

-- Helper function: lấy role hiện tại
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'admin'
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check is leader hoặc admin
CREATE OR REPLACE FUNCTION is_leader_or_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('admin', 'leader_content', 'leader_booking')
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Videos: tất cả authenticated đọc được
CREATE POLICY "videos_select" ON videos FOR SELECT
  TO authenticated USING (true);

-- Videos: Admin + Leader insert
CREATE POLICY "videos_insert" ON videos FOR INSERT
  TO authenticated WITH CHECK (is_leader_or_admin());

-- Videos: Leader Content update assigned_user_id cho video brand
CREATE POLICY "videos_update_leader_content" ON videos FOR UPDATE
  TO authenticated USING (
    get_user_role() IN ('admin', 'leader_content')
    AND (get_user_role() = 'admin' OR source_type = 'brand')
  );

-- Videos: Leader Booking update assigned_user_id cho video koc
CREATE POLICY "videos_update_leader_booking" ON videos FOR UPDATE
  TO authenticated USING (
    get_user_role() IN ('admin', 'leader_booking')
    AND (get_user_role() = 'admin' OR source_type = 'koc')
  );

-- Video Tags: NV chỉ gắn tag cho video mình được assign
CREATE POLICY "video_tags_insert_staff" ON video_tags FOR INSERT
  TO authenticated WITH CHECK (
    is_leader_or_admin()
    OR (
      EXISTS (
        SELECT 1 FROM videos
        WHERE videos.id = video_id
        AND videos.assigned_user_id = auth.uid()
      )
    )
  );
```

---

## 4. Routing & Pages

### 4.1 Cấu trúc Routes (Next.js App Router)

```
app/
├── (auth)/
│   └── login/page.tsx              -- Trang đăng nhập
│
├── (main)/layout.tsx               -- Layout chính (sidebar + topbar)
│   ├── dashboard/page.tsx          -- Dashboard tổng hợp
│   ├── team/
│   │   ├── content/page.tsx        -- Team Content (Thương hiệu)
│   │   └── booking/page.tsx        -- Team Booking (KOC/Affiliate)
│   ├── guideline/page.tsx          -- Tag Guideline
│   └── admin/
│       ├── upload/page.tsx         -- Upload dữ liệu
│       ├── accounts/page.tsx       -- Quản lý tài khoản
│       ├── products/page.tsx       -- Product Mapping
│       ├── tags/page.tsx           -- Content Tags CRUD
│       └── settings/page.tsx       -- Cấu hình (Highlight rules)
│
├── layout.tsx                      -- Root layout
└── globals.css                     -- Tailwind directives + dark theme
```

### 4.2 Middleware (Auth Guard)

```typescript
// middleware.ts
// Redirect chưa đăng nhập → /login
// Redirect đã đăng nhập + vào /login → /dashboard
// Check role cho /admin/* routes (chỉ admin + leader)
```

---

## 5. Các Module kỹ thuật chính

### 5.1 Excel Upload Engine

```
Luồng upload:
1. User chọn file .xlsx + chọn loại (Thương hiệu / KOC)
2. Client đọc file bằng xlsx (SheetJS) → JSON array
3. Validate:
   a. Kiểm tra cột bắt buộc (25 cột theo PRD mục 3.2)
   b. Kiểm tra kiểu dữ liệu (number, date, percentage)
   c. Hiển thị preview 5 dòng đầu
4. User confirm → Batch upsert vào Supabase
   - Dùng video_id làm conflict key (ON CONFLICT DO UPDATE)
   - Gán source_type = 'brand' hoặc 'koc' dựa trên lựa chọn
5. Ghi upload_history
6. Hiển thị kết quả: X bản ghi mới, Y bản ghi cập nhật
```

**Mapping cột Excel → Database:**

| Cột Excel (tiếng Việt) | Cột Database |
|---|---|
| Tên nhà sáng tạo | creator_name |
| ID nhà sáng tạo | creator_id |
| Thông tin video | video_title |
| ID video | video_id |
| Thời gian | published_at |
| Sản phẩm | raw_product_name |
| VV | views |
| Lượt thích | likes |
| Bình luận | comments |
| Lượt chia sẻ | shares |
| Người theo dõi mới | new_followers |
| Lượt nhấp từ Xem đến Thích | view_to_like_clicks |
| Lượt hiển thị sản phẩm | product_impressions |
| Lượt nhấp sản phẩm | product_clicks |
| Số khách hàng độc nhất | unique_buyers |
| Đơn hàng | orders |
| Số món bán ra từ video | items_sold |
| Tổng giá trị hàng hóa (Video) (₫) | total_merchandise_value |
| GPM (₫) | gpm |
| GMV quy ra từ video bán hàng (₫) | gmv |
| Tỷ lệ nhấp (Video) | ctr |
| Tỷ lệ từ Xem đến Thích | view_to_like_rate |
| Tỷ lệ xem hết video | completion_rate |
| Tỷ lệ nhấp đến đặt hàng (Video) | click_to_order_rate |
| Chẩn đoán | diagnosis |

### 5.2 Bảng chi tiết video (Data Table Component)

**Yêu cầu kỹ thuật:**
- Horizontal scroll khi nhiều cột
- 3 cột sticky bên trái: Video, Creator, Nguồn
- Text 1 hàng (white-space: nowrap), truncate + tooltip cho text dài
- Sort theo bất kỳ cột nào
- Pagination hoặc virtual scroll (>500 dòng)

**20 cột hiển thị (theo PRD mục 4.3.3):**

| # | Header hiển thị | Data source | Format |
|---|---|---|---|
| 1 | Video | video_title | Text, truncate 40 chars |
| 2 | Creator | creator_name | Text |
| 3 | Nguồn | source_type | Badge: "Thương hiệu" (xanh) / "KOC" (tím) |
| 4 | ID Video | video_id | Text, monospace |
| 5 | Nhân sự | assigned_user_id → profiles.display_name | Dropdown (Leader/Admin) hoặc text (NV). "Chưa gắn" nếu null |
| 6 | Ngày đăng | published_at | DD/MM/YYYY |
| 7 | Sản phẩm | master_product_id → products.name (hoặc raw_product_name) | Text |
| 8 | Views | views | Number format: 1.234 |
| 9 | Tương tác | engagement (computed) | Number |
| 10 | Follow mới | new_followers | Number |
| 11 | GMV | gmv | Currency: x.xxx.xxxđ, xanh nếu >0, đỏ nếu =0 |
| 12 | Đơn hàng | orders | Number |
| 13 | GPM | gpm | Currency |
| 14 | CTR | ctr | Percentage: x,xx% |
| 15 | Xem hết | completion_rate | Percentage |
| 16 | Nhấp→Đặt | click_to_order_rate | Percentage |
| 17 | Chẩn đoán | diagnosis | Text, truncate, tooltip full text |
| 18 | Tags | video_tags JOIN tags | Badge list |
| 19 | Highlight | computed từ highlight_rules | Icon/badge |
| 20 | Thao tác | — | Nút "Gắn Tag" (text 1 hàng, no wrap) |

### 5.3 Highlight Engine

Logic tính toán trực tiếp bằng SQL View hoặc client-side:

```sql
-- Ví dụ: View highlight video viral
CREATE VIEW video_highlights AS
SELECT
  v.id,
  v.views,
  avg_views.avg_v,
  CASE
    WHEN v.views > avg_views.avg_v * 3 THEN 'viral'
    WHEN v.gmv > 0 AND v.gmv >= percentile_cont(0.9) WITHIN GROUP (ORDER BY v2.gmv) THEN 'top_performance'
    ELSE NULL
  END AS highlight_type
FROM videos v
CROSS JOIN LATERAL (
  SELECT AVG(views) as avg_v FROM videos WHERE creator_id = v.creator_id
) avg_views;
```

### 5.4 Screenshot Export

```typescript
// Sử dụng html2canvas
import html2canvas from 'html2canvas';

async function exportDashboard(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  const canvas = await html2canvas(element, { backgroundColor: '#0f0f23' });
  const link = document.createElement('a');
  link.download = `DECOCO_${filename}_${new Date().toISOString().split('T')[0]}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
```

---

## 6. UI/UX Specifications

### 6.1 Dark Theme (bắt buộc)

**Tham khảo giao diện:** App DECOCO Onboarding (onboarding-decoco.vercel.app)

| Element | Color |
|---|---|
| Background chính | #0f0f23 hoặc tương đương |
| Card background | #1a1a3e hoặc nhỉnh hơn nền chính |
| Card border | rgba(255,255,255,0.08) |
| Card border-radius | 12–16px |
| Text chính | #ffffff |
| Text phụ | #a0a0b8 |
| Accent (primary) | #7c3aed (tím) hoặc #6366f1 (indigo) |
| Success | #22c55e |
| Danger | #ef4444 |
| Warning | #eab308 |
| Badge "Thương hiệu" | bg-emerald-500/20, text-emerald-400 |
| Badge "KOC" | bg-purple-500/20, text-purple-400 |

### 6.2 Sidebar

- Nền gradient tối hoặc nền đậm hơn background
- Logo "DECOCO" ở trên cùng, subtitle dưới logo
- Menu items có icon (lucide-react) bên trái
- Phân nhóm: "MENU CHÍNH" và "QUẢN TRỊ"
- Active state: highlight background + text accent
- User info ở dưới cùng: avatar + tên + role

### 6.3 Scorecards

- Grid ngang (3 hoặc 6 cột tuỳ kích thước)
- Mỗi card: icon nhỏ, label, số lớn bold, % thay đổi (xanh tăng, đỏ giảm)
- Background card khác nền chính, bo góc, padding 16–24px

### 6.4 Data Table

- Header: uppercase, text nhỏ 12px, bold, background tối hơn
- Rows: border-bottom subtle, hover highlight
- ALL text: white-space: nowrap (KHÔNG XUỐNG DÒNG)
- Cột dài (Video, Chẩn đoán): truncate + tooltip on hover
- Sticky columns bên trái
- Horizontal scrollbar visible khi cần

---

## 7. Quy trình phát triển

### Phase 1 — Foundation & Data (Tuần 1–2)
1. Setup Next.js + Tailwind + shadcn/ui (dark theme)
2. Tạo database schema trên Supabase (Singapore)
3. Setup RLS policies
4. Auth: Login + Role-based routing
5. Upload Excel → Parse → Upsert vào videos
6. Dashboard tổng hợp: Scorecards + biểu đồ GMV

### Phase 2 — Team Dashboards & Tagging (Tuần 3–4)
7. Bảng chi tiết video (20 cột, horizontal scroll, sticky)
8. Leader gắn nhân sự cho video
9. Tags CRUD + Gắn tag (hàng loạt + từng video)
10. Tag Guideline page
11. Leaderboard NV Content + NV Booking + KOC
12. Bộ lọc nâng cao

### Phase 3 — Insights & Polish (Tuần 5–6)
13. Product Mapping
14. Highlight system
15. Rule-based đề xuất
16. Export PNG
17. Admin: Quản lý tài khoản, Cấu hình
18. Performance optimization + Testing
