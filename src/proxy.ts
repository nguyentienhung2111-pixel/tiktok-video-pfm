import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Proxy (Middleware) xác thực cấp Server: chặn truy cập trái phép trước khi render.
// - Chưa đăng nhập + không ở /login  → redirect /login
// - Đã đăng nhập  + đang ở /login    → redirect /dashboard
// Lưu ý: Next.js 16 dùng quy ước file "proxy.ts" (export hàm `proxy`),
// thay cho "middleware.ts" đã bị deprecate.
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() xác thực lại JWT với Supabase (an toàn hơn getSession trong middleware/proxy)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Chưa đăng nhập → chỉ được ở /login
  if (!user && pathname !== '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Đã đăng nhập nhưng vào /login → về /dashboard
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  // Bỏ qua static assets và /api (API dùng service-role key + logic riêng)
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
