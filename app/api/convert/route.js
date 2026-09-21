import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SHOPEE_AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID || '17361810588';
const AT_API_KEY = process.env.ACCESSTRADE_API_KEY || '0hO~BRrVRzxxHBK2CH4jLfnxat';

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

    // Làm sạch sub_id / sub4
    const cleanSubId = String(userId)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50) || 'guest';

    // Nhận diện nền tảng
    let platform = 'Khác';
    if (cleanUrl.includes('shopee.vn') || cleanUrl.includes('shp.ee') || cleanUrl.includes('shope.ee')) {
      platform = 'Shopee';
    } else if (cleanUrl.includes('lazada.vn') || cleanUrl.includes('s.lazada.vn')) {
      platform = 'Lazada';
    } else if (cleanUrl.includes('tiktok.com') || cleanUrl.includes('vt.tiktok.com')) {
      platform = 'TikTok';
    }

    let affiliateUrl = '';

    // ============================================================
    // XỬ LÝ LINK THEO NỀN TẢNG
    // ============================================================
    if (platform === 'Shopee') {
      const baseProductUrl = cleanUrl.split('?')[0];
      const encodedOrigin = encodeURIComponent(baseProductUrl);
      affiliateUrl = `https://s.shopee.vn/an_redir?origin_link=${encodedOrigin}&affiliate_id=${SHOPEE_AFFILIATE_ID}&sub_id=${cleanSubId}`;
    } else {
      // Cấu trúc chuẩn chuyển hướng Deep Link của AccessTrade qua isclix kèm sub_id
      const encodedUrl = encodeURIComponent(cleanUrl);
      affiliateUrl = `https://go.isclix.com/deep_link/${AT_API_KEY}?url=${encodedUrl}&sub_id=${cleanSubId}`;
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