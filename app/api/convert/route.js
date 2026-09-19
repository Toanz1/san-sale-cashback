import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Điền Affiliate ID của bạn hoặc cấu hình trong Vercel Environment Variables
const SHOPEE_AFFILIATE_ID = '17361810588';

// Hàm mở link rút gọn chống bị Shopee chặn trên server Vercel
async function resolveShopeeUrl(shortUrl) {
  try {
    const res = await fetch(shortUrl, {
      method: 'GET',
      redirect: 'manual', // Bắt trực tiếp header Location để tránh bị Shopee chặn redirect
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      },
    });

    const location = res.headers.get('location');
    if (location) {
      return location;
    }
    return shortUrl;
  } catch (err) {
    console.error('Không thể mở link rút gọn:', err);
    return shortUrl;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const rawUrl = body.originalUrl || body.url || '';
    const userId = body.userId || 'guest';

    if (!rawUrl || !rawUrl.trim().startsWith('http')) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đường link hợp lệ (bắt đầu bằng http:// hoặc https://)' },
        { status: 400 }
      );
    }

    let cleanUrl = rawUrl.trim();

    // 1. Nhận diện và mở link nếu là link rút gọn của Shopee / TikTok
    if (
      cleanUrl.includes('shp.ee') ||
      cleanUrl.includes('s.shopee.vn') ||
      cleanUrl.includes('shope.ee')
    ) {
      cleanUrl = await resolveShopeeUrl(cleanUrl);
    }

    // Làm sạch sub_id (chỉ cho phép ký tự an toàn)
    const cleanSubId = String(userId)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50) || 'guest';

    // 2. Nhận diện nền tảng
    let platform = 'Khác';
    if (cleanUrl.includes('shopee.vn') || cleanUrl.includes('shp.ee')) {
      platform = 'Shopee';
    } else if (cleanUrl.includes('lazada.vn')) {
      platform = 'Lazada';
    } else if (cleanUrl.includes('tiktok.com')) {
      platform = 'TikTok';
    }

    let affiliateUrl = '';

    // ============================================================
    // GHÉP LINK SHOPEE TRỰC TIẾP QUA AFFILIATE ID
    // ============================================================
    if (platform === 'Shopee') {
      // Cắt bỏ các tham số rác sau dấu ?
      const baseProductUrl = cleanUrl.split('?')[0];
      const encodedOrigin = encodeURIComponent(baseProductUrl);

      // Cổng redirect tiếp thị liên kết chuẩn của Shopee
      affiliateUrl = `https://s.shopee.vn/an_redir?origin_link=${encodedOrigin}&affiliate_id=${SHOPEE_AFFILIATE_ID}&sub_id=${cleanSubId}`;
    } 
    // ============================================================
    // LAZADA / TIKTOK
    // ============================================================
    else {
      const baseProductUrl = cleanUrl.split('?')[0];
      const encodedUrl = encodeURIComponent(baseProductUrl);
      const MO_PARTNER_CODE = process.env.NEXT_PUBLIC_MASOFFER_ID || 'masoffer_id';
      affiliateUrl = `https://go.masoffer.net/v0/${MO_PARTNER_CODE}/?go=${encodedUrl}&traffic_id=${cleanSubId}`;
    }

    // ============================================================
    // LƯU LỊCH SỬ VÀO SUPABASE (NẾU ĐÃ ĐĂNG NHẬP)
    // ============================================================
    if (userId && userId !== 'guest') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from('link_history').insert({
          user_id: userId,
          original_url: rawUrl,
          affiliate_url: affiliateUrl,
          platform: platform,
        });
      }
    }

    return NextResponse.json({ affiliateUrl, platform });
  } catch (err) {
    console.error('Lỗi xử lý Convert:', err);
    return NextResponse.json(
      { error: 'Hệ thống chuyển đổi link tạm thời bận, vui lòng thử lại!' },
      { status: 500 }
    );
  }
}