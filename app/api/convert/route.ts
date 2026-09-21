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

    const cleanSubId = String(userId)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50) || 'guest';

    let platform = 'Khác';
    let affiliateUrl = '';

    // Xử lý trực tiếp không qua fetch ngầm giúp tốc độ load tức thì
    if (cleanUrl.includes('shopee.vn') || cleanUrl.includes('shp.ee') || cleanUrl.includes('shope.ee')) {
      platform = 'Shopee';
      const baseProductUrl = cleanUrl.split('?')[0];
      const encodedOrigin = encodeURIComponent(baseProductUrl);
      affiliateUrl = `https://s.shopee.vn/an_redir?origin_link=${encodedOrigin}&affiliate_id=${SHOPEE_AFFILIATE_ID}&sub_id=${cleanSubId}`;
    } 
    else if (cleanUrl.includes('tiktok.com') || cleanUrl.includes('vt.tiktok.com')) {
      platform = 'TikTok Shop';
      const sourceId = 'Publisher Coupon'; 
      const encodedTargetUrl = encodeURIComponent(cleanUrl);
      // Accesstrade tự động xử lý link rút gọn vt.tiktok.com
      affiliateUrl = `https://go.isclix.com/deep_link?url=${encodedTargetUrl}&utm_source=${sourceId}&sub_id=${cleanSubId}`;
    }
    else if (cleanUrl.includes('lazada.vn') || cleanUrl.includes('s.lazada.vn')) {
      platform = 'Lazada';
      const baseUrl = cleanUrl.split('?')[0];
      affiliateUrl = `${baseUrl}?laz_aff_id=${LAZADA_AFFILIATE_ID}&sub_id=${cleanSubId}`;
    }
    else {
      platform = 'Sàn khác';
      const sourceId = 'Publisher Coupon';
      const encodedUrl = encodeURIComponent(cleanUrl);
      affiliateUrl = `https://go.isclix.com/deep_link?url=${encodedUrl}&utm_source=${sourceId}&sub_id=${cleanSubId}`;
    }

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

    return NextResponse.json({ 
      affiliateUrl, 
      platform,
      productInfo: {
        title: `Sản phẩm chính hãng từ ${platform}`,
        shop: `Gian hàng ${platform} uy tín`,
        image: platform === 'TikTok Shop' 
          ? 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a' 
          : platform === 'Shopee' 
          ? 'https://images.unsplash.com/photo-1472851294608-062f824d29cc'
          : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30'
      }
    });
  } catch (err) {
    console.error('Lỗi xử lý Convert:', err);
    return NextResponse.json(
      { error: 'Hệ thống chuyển đổi link tạm thời bận, vui lòng thử lại!' },
      { status: 500 }
    );
  }
}