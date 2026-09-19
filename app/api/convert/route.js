import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 1. Hàm tự động mở link rút gọn (s.shopee.vn, shp.ee, vt.tiktok.com) để lấy link gốc
async function resolveFinalUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
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
      return NextResponse.json(
        { error: 'Vui lòng nhập link hợp lệ (bắt đầu bằng http hoặc https)' },
        { status: 400 }
      );
    }

    // Tự động giải mã nếu là link rút gọn
    let finalUrl = originalUrl;
    if (
      originalUrl.includes('s.shopee.vn') ||
      originalUrl.includes('shp.ee') ||
      originalUrl.includes('vt.tiktok.com')
    ) {
      finalUrl = await resolveFinalUrl(originalUrl);
    }

    // Nhận diện nền tảng sàn
    let platform = 'Khác';
    if (finalUrl.includes('shopee.vn')) platform = 'Shopee';
    else if (finalUrl.includes('lazada.vn')) platform = 'Lazada';
    else if (finalUrl.includes('tiktok.com')) platform = 'TikTok';

    let affiliateUrl = '';

    // ==========================================
    // TRƯỜNG HỢP 1: SHOPEE -> GỌI QUA CAMLINK
    // ==========================================
    if (platform === 'Shopee') {
      const CAMLINK_API_KEY =
        process.env.CAMLINK_API_KEY ||
        'clk_live_aJphIRieUqtK9NAir5J98nRdYZIRyaJQMY715CicCeCLYT9g';

      const camlinkRes = await fetch(
        'https://apicam.hoantienz.com/api/v1/affiliate/convert-link',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CAMLINK_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            original_links: [finalUrl],
            sub_id_1: userId ? String(userId).slice(0, 100) : 'guest',
          }),
        }
      );

      const resJson = await camlinkRes.json();
      affiliateUrl = resJson?.data?.data?.batchCustomLink?.[0]?.shortLink;

      if (!affiliateUrl) {
        console.error('Lỗi Camlink:', resJson);
        return NextResponse.json(
          {
            error:
              resJson?.message ||
              'Không thể tạo link Shopee. Kiểm tra kết nối Cookie Shopee trên Camlink!',
          },
          { status: 500 }
        );
      }
    } 
    // ==========================================
    // TRƯỜNG HỢP 2: LAZADA / TIKTOK -> QUA MASOFFER
    // ==========================================
    else {
      const cleanUrl = finalUrl.split('?')[0];
      const encodedUrl = encodeURIComponent(cleanUrl);
      const MO_PARTNER_CODE =
        process.env.NEXT_PUBLIC_MASOFFER_ID || 'dien_ma_masoffer_vao_day';

      affiliateUrl = `https://go.masoffer.net/v0/${MO_PARTNER_CODE}/?go=${encodedUrl}&traffic_id=${userId || 'guest'}`;
    }

    // ==========================================
    // LƯU LỊCH SỬ VÀO SUPABASE (NẾU ĐÃ ĐĂNG NHẬP)
    // ==========================================
    if (userId && userId !== 'guest') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

    return NextResponse.json({ affiliateUrl, platform });
  } catch (error) {
    console.error('Lỗi API convert:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi xử lý link' },
      { status: 500 }
    );
  }
}