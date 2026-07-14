import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your .env.local file.');
}

// createBrowserClient lưu session vào cookie (không chỉ localStorage),
// nhờ đó middleware phía server đọc được phiên đăng nhập.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
