import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Thay chuỗi số bên dưới bằng Affiliate ID (Publisher ID) của bạn trên Shopee
const SHOPEE_AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID || '17361810588';

// Hàm mở link rút gọn (vn.shp.ee, shp.ee, s.shopee.vn, vt.tiktok.com) để lấy URL gốc
async function resolveRedirectUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    return res.url || url;
  } catch (e) {
    return url;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const rawUrl = body.originalUrl || body.url;
    const userId = body.userId || 'guest';

    if (!rawUrl || !rawUrl.trim().startsWith('http')) {
      return NextResponse.json(
        { error: 'Vui lòng nhập link hợp lệ (bắt đầu bằng http hoặc https)' },
        { status: 400 }
      );
    }

    let cleanUrl = rawUrl.trim();

    // 1. Tự động giải mã nếu là link rút gọn
    if (
      cleanUrl.includes('shp.ee') ||
      cleanUrl.includes('s.shopee.vn') ||
      cleanUrl.includes('shope.ee') ||
      cleanUrl.includes('vt.tiktok.com')
    ) {
      cleanUrl = await resolveRedirectUrl(cleanUrl);
    }

    // Làm sạch sub_id (chỉ giữ chữ, số, gạch dưới)
    const cleanSubId = String(userId)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50) || 'guest';

    // 2. Nhận diện nền tảng
    let platform = 'Khác';
    if (cleanUrl.includes('shopee.vn') || cleanUrl.includes('shope.ee')) {
      platform = 'Shopee';
    } else if (cleanUrl.includes('lazada.vn')) {
      platform = 'Lazada';
    } else if (cleanUrl.includes('tiktok.com')) {
      platform = 'TikTok';
    }

    let affiliateUrl = '';

    // ============================================================
    // 3. TẠO LINK TIẾP THỊ THEO NỀN TẢNG
    // ============================================================
    if (platform === 'Shopee') {
      // Cắt bỏ các tham số rác đằng sau dấu ?
      const productUrlNoQuery = cleanUrl.split('?')[0];
      const encodedOrigin = encodeURIComponent(productUrlNoQuery);

      // Ghép link qua cổng redirect an_redir chính thức của Shopee
      affiliateUrl = `https://s.shopee.vn/an_redir?origin_link=${encodedOrigin}&affiliate_id=${SHOPEE_AFFILIATE_ID}&sub_id=${cleanSubId}`;
    } else {
      // Lazada / TikTok qua mạng tiếp thị liên kết (MasOffer/Accesstrade)
      const urlBeforeParams = cleanUrl.split('?')[0];
      const encodedUrl = encodeURIComponent(urlBeforeParams);
      const MO_PARTNER_CODE = process.env.NEXT_PUBLIC_MASOFFER_ID || 'masoffer_id';
      affiliateUrl = `https://go.masoffer.net/v0/${MO_PARTNER_CODE}/?go=${encodedUrl}&traffic_id=${cleanSubId}`;
    }

    // ============================================================
    // 4. LƯU LỊCH SỬ VÀO SUPABASE (NẾU ĐÃ ĐĂNG NHẬP)
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
    console.error('Lỗi Server Convert:', err);
    return NextResponse.json(
      { error: 'Hệ thống đang bận, vui lòng thử lại sau!' },
      { status: 500 }
    );
  }
}