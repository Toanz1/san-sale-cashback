import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SHOPEE_AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID || '17361810588';
const LAZADA_AFFILIATE_ID = process.env.LAZADA_AFFILIATE_ID || '264211329';

// Hàm mở link rút gọn chống bị Shopee/Lazada chặn trên server Vercel
async function resolveShortUrl(shortUrl) {
  try {
    const res = await fetch(shortUrl, {
      method: 'GET',
      redirect: 'manual',
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

    // 1. Nhận diện và mở link rút gọn của các sàn
    if (
      cleanUrl.includes('shp.ee') ||
      cleanUrl.includes('s.shopee.vn') ||
      cleanUrl.includes('shope.ee') ||
      cleanUrl.includes('s.lazada.vn') ||
      cleanUrl.includes('lazada.vn/s.')
    ) {
      cleanUrl = await resolveShortUrl(cleanUrl);
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
    // SHOPEE AFFILIATE
    // ============================================================
    if (platform === 'Shopee') {
      const baseProductUrl = cleanUrl.split('?')[0];
      const encodedOrigin = encodeURIComponent(baseProductUrl);
      affiliateUrl = `https://s.shopee.vn/an_redir?origin_link=${encodedOrigin}&affiliate_id=${SHOPEE_AFFILIATE_ID}&sub_id=${cleanSubId}`;
    } 
    // ============================================================
    // ============================================================
    // LAZADA AFFILIATE (Giữ nguyên toàn bộ link gốc kèm tham số)
    // ============================================================
    else if (platform === 'Lazada') {
      const encodedUrl = encodeURIComponent(cleanUrl);
      affiliateUrl = `https://s.lazada.vn/s.${LAZADA_AFFILIATE_ID}?sub_id=${cleanSubId}&url=${encodedUrl}`;
    }
    // ============================================================
    // TIKTOK SHOP HOẶC CÁC SÀN KHÁC
    // ============================================================
    else {
      const baseProductUrl = cleanUrl.split('?')[0];
      const encodedUrl = encodeURIComponent(baseProductUrl);
      // Nếu có Accesstrade hoặc giữ nguyên link gốc kèm sub_id
      affiliateUrl = `${baseProductUrl}?sub_id=${cleanSubId}`;
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