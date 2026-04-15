-- =============================================
-- PROFILES TABLE (no auth.users dependency)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff_content' CHECK (role IN ('admin', 'leader_content', 'leader_booking', 'staff_content', 'staff_booking')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PRODUCTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category TEXT,
  price NUMERIC(18,0) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PRODUCT SKU MAPPINGS
-- =============================================
CREATE TABLE IF NOT EXISTS product_sku_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_name TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- VIDEOS TABLE (25 metric columns)
-- =============================================
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT UNIQUE NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'brand' CHECK (source_type IN ('brand', 'koc')),
  creator_name TEXT,
  creator_id TEXT,
  video_title TEXT,
  published_at DATE,
  product_name TEXT,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  engagement BIGINT GENERATED ALWAYS AS (likes + comments + shares) STORED,
  new_followers BIGINT DEFAULT 0,
  orders BIGINT DEFAULT 0,
  gmv NUMERIC(18,0) DEFAULT 0,
  gpm NUMERIC(18,2) DEFAULT 0,
  ctr NUMERIC(6,2) DEFAULT 0,
  completion_rate NUMERIC(6,2) DEFAULT 0,
  conversion_rate NUMERIC(6,2) DEFAULT 0,
  click_to_order_rate NUMERIC(6,2) DEFAULT 0,
  video_duration_sec INT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  diagnosis TEXT,
  assigned_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  raw_data JSONB,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TAG GROUPS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS tag_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8b5cf6',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TAGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  group_id UUID REFERENCES tag_groups(id) ON DELETE SET NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- VIDEO TAGS (junction)
-- =============================================
CREATE TABLE IF NOT EXISTS video_tags (
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  tagged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tagged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, tag_id)
);

-- =============================================
-- TAG GUIDELINE
-- =============================================
CREATE TABLE IF NOT EXISTS tag_guideline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID UNIQUE REFERENCES tags(id) ON DELETE CASCADE,
  content TEXT,
  examples TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- UPLOAD HISTORY
-- =============================================
CREATE TABLE IF NOT EXISTS upload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  file_name TEXT,
  source_type TEXT CHECK (source_type IN ('brand', 'koc')),
  row_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- HIGHLIGHT RULES
-- =============================================
CREATE TABLE IF NOT EXISTS highlight_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('gt', 'lt', 'gte', 'lte', 'eq')),
  threshold NUMERIC NOT NULL,
  color TEXT NOT NULL DEFAULT '#10b981',
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role = 'admin');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_leader_or_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role IN ('admin', 'leader_content', 'leader_booking'));
$$ LANGUAGE sql STABLE;

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS (permissive for now)
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sku_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_guideline ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_all_profiles ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_products ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_product_sku_mappings ON product_sku_mappings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_videos ON videos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_tag_groups ON tag_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_tags ON tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_video_tags ON video_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_tag_guideline ON tag_guideline FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_upload_history ON upload_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_highlight_rules ON highlight_rules FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- SEED DATA
-- =============================================
INSERT INTO profiles (username, display_name, role) VALUES
  ('admin', 'Admin DECOCO', 'admin'),
  ('leader_content_01', 'Leader Content', 'leader_content'),
  ('leader_booking_01', 'Leader Booking', 'leader_booking'),
  ('staff_content_01', 'Nguyen Thi A', 'staff_content'),
  ('staff_content_02', 'Tran Van B', 'staff_content'),
  ('staff_booking_01', 'Le Thi C', 'staff_booking')
ON CONFLICT (username) DO NOTHING;

INSERT INTO tag_groups (name, description, color, sort_order) VALUES
  ('Content Format', 'Dinh dang noi dung video', '#8b5cf6', 1),
  ('Hook Style', 'Kieu hook mo dau video', '#06b6d4', 2),
  ('Conversion', 'Yeu to chuyen doi', '#10b981', 3)
ON CONFLICT DO NOTHING;

INSERT INTO highlight_rules (metric, operator, threshold, color, label, sort_order) VALUES
  ('views', 'gte', 100000, '#10b981', 'Viral', 1),
  ('ctr', 'gte', 5, '#8b5cf6', 'CTR tot', 2),
  ('completion_rate', 'gte', 50, '#06b6d4', 'Xem het tot', 3),
  ('gmv', 'gte', 10000000, '#f59e0b', 'GMV cao', 4)
ON CONFLICT DO NOTHING;
