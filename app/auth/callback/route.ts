import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Đổi authorization code lấy session
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Chuyển hướng về trang chủ sau khi xác thực
  return NextResponse.redirect(`${origin}/`);
}