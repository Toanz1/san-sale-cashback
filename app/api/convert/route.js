import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SHOPEE_AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID || '17361810588';
const LAZADA_AFFILIATE_ID = process.env.LAZADA_AFFILIATE_ID || '264211329';

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

    const cleanUrl = rawUrl.trim();

    // Làm sạch sub_id
    const cleanSubId = String(userId)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50) || 'guest';

    // Nhận diện nền tảng
    let platform = 'Khác';
    if (cleanUrl.includes('shopee.vn') || cleanUrl.includes('shp.ee') || cleanUrl.includes('shope.ee')) {
      platform = 'Shopee';
    } else if (cleanUrl.includes('lazada.vn') || cleanUrl.includes('s.lazada.vn')) {
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
    // LAZADA / CÁC SÀN KHÁC DÙNG ACCESSTRADE
    // ============================================================
    else {
      const encodedUrl = encodeURIComponent(cleanUrl);
      // Thay thế bằng mã Domain/Campaign của bạn trên ACCESSTRADE (ví dụ: go.isclix.com)
      const AT_CAMPAIGN_CODE = process.env.NEXT_PUBLIC_ACCESSTRADE_ID || '467xxxxxxxx'; // Điền mã của bạn vào đây
      
      affiliateUrl = `https://go.isclix.com/deep_link/${AT_CAMPAIGN_CODE}?url=${encodedUrl}&traffic_id=${cleanSubId}`;
    }
    // ============================================================
    // TIKTOK SHOP & KHÁC
    // ============================================================
    else {
      const baseProductUrl = cleanUrl.split('?')[0];
      affiliateUrl = `${baseProductUrl}?sub_id=${cleanSubId}`;
    }

    // ============================================================
    // LƯU LỊCH SỬ VÀO SUPABASE
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