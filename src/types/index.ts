export type UserRole = 'admin' | 'leader_content' | 'leader_booking' | 'staff_content' | 'staff_booking';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Video {
  id: string;
  video_id: string;
  source_type: 'brand' | 'koc';
  creator_name: string;
  creator_id: string;
  video_title: string;
  published_at: string;
  product_name: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  new_followers: number;
  orders: number;
  gmv: number;
  gpm: number;
  ctr: number;
  completion_rate: number;
  conversion_rate: number;
  diagnosis: string;
  assigned_user_id: string | null;
  tags: string[];
}
