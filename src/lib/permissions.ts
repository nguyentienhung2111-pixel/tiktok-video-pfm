import { UserRole } from '@/types';

type PageKey =
  | 'dashboard'
  | 'content'
  | 'booking'
  | 'guideline'
  | 'upload'
  | 'products'
  | 'koc-mapping'
  | 'tags'
  | 'accounts'
  | 'settings';

const PAGE_ACCESS: Record<PageKey, UserRole[]> = {
  dashboard:   ['admin', 'leader_content', 'leader_booking', 'staff_content', 'staff_booking'],
  guideline:   ['admin', 'leader_content', 'leader_booking', 'staff_content', 'staff_booking'],
  content:     ['admin', 'leader_content', 'staff_content'],
  booking:     ['admin', 'leader_booking', 'staff_booking'],
  'koc-mapping': ['admin', 'leader_booking', 'staff_booking'],
  tags:        ['admin', 'leader_content', 'leader_booking'],
  upload:      ['admin'],
  products:    ['admin'],
  accounts:    ['admin'],
  settings:    ['admin'],
};

export function canAccess(role: string | undefined, page: PageKey): boolean {
  if (!role) return false;
  if (role === 'admin') return true;
  return (PAGE_ACCESS[page] as string[]).includes(role);
}
