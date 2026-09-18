import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Hàm tự động mở link rút gọn (s.shopee.vn, shp.ee) để lấy link đích thực sự
async function resolveFinalUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return res.url || url;
  } catch (err) {
    return url;
  }
}

export async function POST(req) {
  try {
    const { originalUrl, userId } = await req.json();

    if (!originalUrl || !originalUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Vui lòng nhập link hợp lệ (bắt đầu bằng http)' }, { status: 400 });
    }

    // 1. Tự động giải mã nếu là link rút gọn của Shopee / TikTok
    let finalUrl = originalUrl;
    if (originalUrl.includes('s.shopee.vn') || originalUrl.includes('shp.ee') || originalUrl.includes('vt.tiktok.com')) {
      finalUrl = await resolveFinalUrl(originalUrl);
    }

    // 2. Nhận diện nền tảng sàn
    let platform = 'Khác';
    if (finalUrl.includes('shopee.vn')) platform = 'Shopee';
    else if (finalUrl.includes('lazada.vn')) platform = 'Lazada';
    else if (finalUrl.includes('tiktok.com')) platform = 'TikTok';

    // 3. Làm sạch link (bỏ query tracking rác của app)
    const cleanUrl = finalUrl.split('?')[0];
    const encodedUrl = encodeURIComponent(cleanUrl);

    // 4. Mã đối tác MasOffer
    const MO_PARTNER_CODE = process.env.NEXT_PUBLIC_MASOFFER_ID || 'dien_ma_masoffer_vao_day';
    const affiliateUrl = `https://go.masoffer.net/v0/${MO_PARTNER_CODE}/?go=${encodedUrl}&traffic_id=${userId || 'guest'}`;

    // 5. Lưu lịch sử nếu người dùng đã đăng nhập
    if (userId && userId !== 'guest') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from('link_history').insert({
          user_id: userId,
          original_url: originalUrl,
          affiliate_url: affiliateUrl,
          platform: platform,
        });
      }
    }

    return NextResponse.json({ affiliateUrl });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Lỗi xử lý link' }, { status: 500 });
  }
}