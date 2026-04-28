import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

export async function POST(request: Request) {
  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình trong .env.local' },
      { status: 500 }
    );
  }

  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });
  }

  await supabaseAdmin.from('profiles').delete().eq('id', userId);

  // Auth user may not exist for legacy profiles — ignore "User not found" error
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error && !error.message.includes('User not found')) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
