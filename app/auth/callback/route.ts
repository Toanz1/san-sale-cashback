import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    // Đổi code của Google thành phiên đăng nhập thực sự trên Supabase
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Đăng nhập thành công -> chuyển thẳng về trang chủ
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Nếu có lỗi, đưa về trang đăng nhập
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}