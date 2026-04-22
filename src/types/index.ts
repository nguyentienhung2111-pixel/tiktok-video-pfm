export type UserRole = 'admin' | 'leader_content' | 'leader_booking' | 'staff_content' | 'staff_booking';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface Video {
  id: string;
  video_id: string;
  source_type: 'brand' | 'koc';
  creator_name: string | null;
  creator_id: string | null;
  video_title: string | null;
  published_at: string | null;
  product_name: string | null;
  product_id: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  new_followers: number;
  orders: number;
  gmv: number;
  conversion_rate: number;
  click_to_order_rate: number;
  video_duration_sec: number;
  reach: number;
  impressions: number;
  diagnosis: string | null;
  assigned_user_id: string | null;
  tags: string[];
  raw_data: Record<string, unknown> | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

// Metrics stored per reporting period
export interface VideoPeriodMetrics {
  id: string;
  video_id: string;
  period_start: string;
  period_end: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  orders: number;
  gmv: number;
  new_followers: number;
  impressions: number;
  reach: number;
  engagement: number;
  click_to_order_rate: number;
  items_sold: number;
  created_at: string;
  updated_at: string;
}

// Video with aggregated metrics from RPC function (includes total_count for pagination)
export interface VideoWithMetrics extends Video {
  total_count?: number;
}

export interface TagGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  group_id: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface TagGuideline {
  id: string;
  tag_id: string;
  content: string | null;
  examples: string[];
  updated_at: string;
}

export interface HighlightRule {
  id: string;
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold: number;
  color: string;
  label: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface UploadHistory {
  id: string;
  uploaded_by: string | null;
  file_name: string | null;
  source_type: 'brand' | 'koc' | null;
  row_count: number;
  success_count: number;
  error_count: number;
  errors: Record<string, unknown> | null;
  created_at: string;
}
