import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware nhẹ: chỉ redirect /login → /dashboard nếu có token cookie
// Auth guard chính thức xử lý phía client trong AppShell.tsx
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bỏ qua các static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Kiểm tra Supabase auth cookie (tên cookie chứa 'auth-token')
  const hasAuthCookie = Array.from(req.cookies.getAll()).some(
    ({ name }) => name.includes('auth-token') || name.includes('sb-')
  );

  // Đã login + đang ở trang login → redirect dashboard
  if (hasAuthCookie && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
