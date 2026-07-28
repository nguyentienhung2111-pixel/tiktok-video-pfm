import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === 'your_service_role_key_here') {
    return null;
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Sinh mật khẩu mới an toàn: Decoco@ + 6 ký tự ngẫu nhiên (chữ + số)
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `Decoco@${suffix}`;
}

function buildEmailHtml(displayName: string, newPassword: string) {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#0b0e14; padding:32px; color:#e2e8f0;">
    <div style="max-width:480px; margin:0 auto; background:#161b22; border:1px solid #30363d; border-radius:16px; padding:32px;">
      <h2 style="color:#ffffff; margin:0 0 8px;">DECOCO Analytics</h2>
      <p style="color:#94a3b8; margin:0 0 24px;">Khôi phục mật khẩu</p>
      <p style="color:#e2e8f0;">Xin chào <strong>${displayName}</strong>,</p>
      <p style="color:#e2e8f0;">Mật khẩu mới cho tài khoản của bạn đã được tạo. Vui lòng dùng mật khẩu bên dưới để đăng nhập:</p>
      <div style="background:#0b0e14; border:1px solid #8b5cf6; border-radius:12px; padding:16px; text-align:center; font-size:20px; letter-spacing:1px; color:#c084fc; font-weight:bold; margin:16px 0;">
        ${newPassword}
      </div>
      <p style="color:#94a3b8; font-size:13px;">Vì lý do bảo mật, hãy đăng nhập và đổi lại mật khẩu ngay sau đó trong phần cài đặt tài khoản.</p>
      <p style="color:#475569; font-size:12px; margin-top:24px;">DECOCO Analytics © 2026 — Chỉ dành cho nội bộ. Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.</p>
    </div>
  </div>`;
}

export async function POST(request: Request) {
  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình trong .env.local' },
      { status: 500 }
    );
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey || resendApiKey === 'your_resend_api_key_here') {
    return NextResponse.json(
      { error: 'Dịch vụ gửi email chưa được cấu hình (RESEND_API_KEY).' },
      { status: 500 }
    );
  }

  const { email } = await request.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Vui lòng nhập email.' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Kiểm tra email tồn tại & đang hoạt động trong bảng profiles
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, display_name, is_active')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile || !profile.is_active) {
    return NextResponse.json(
      { error: 'Email không tồn tại hoặc tài khoản đã bị vô hiệu hóa.' },
      { status: 404 }
    );
  }

  // 2. Sinh mật khẩu mới an toàn
  const newPassword = generatePassword();

  // 3. Cập nhật mật khẩu mới trên Supabase Auth
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // 4. Gửi email qua Resend
  const resend = new Resend(resendApiKey);
  const { error: sendError } = await resend.emails.send({
    from: 'DECOCO Analytics <no-reply@trangsucdecoco.vn>',
    to: profile.email,
    subject: 'Khôi phục mật khẩu — DECOCO Analytics',
    html: buildEmailHtml(profile.display_name || 'bạn', newPassword),
  });

  if (sendError) {
    return NextResponse.json(
      { error: 'Không gửi được email: ' + sendError.message },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
