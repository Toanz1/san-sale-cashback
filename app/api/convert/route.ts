import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SHOPEE_AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID || '17361810588';
const LAZADA_AFFILIATE_ID = process.env.LAZADA_AFFILIATE_ID || '264211329';

// Hàm mở rộng link rút gọn siêu tốc (giải mã vt.tiktok.com thành link gốc)
async function expandShortUrl(url) {
  try {
    if (url.includes('vt.tiktok.com') || url.includes('tiktok.com/t/') || url.includes('shp.ee') || url.includes('s.shopee.vn')) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Giới hạn tối đa 3 giây để không bị chậm

      const response = await fetch(url, {
        method: 'GET', // Dùng GET thay vì HEAD để tránh bị TikTok chặn bot
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      clearTimeout(timeoutId);
      if (response.url && !response.url.includes('404') && !response.url.includes('error')) {
        return response.url;
      }
    }
  } catch (e) {
    console.error('Lỗi giải mã link rút gọn, sử dụng link gốc:', e.message);
  }
  return url;
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

    const cleanUrl = rawUrl.trim();
    // Giải mã link rút gọn thành link chi tiết sản phẩm đầy đủ
    const expandedUrl = await expandShortUrl(cleanUrl);

    const cleanSubId = String(userId)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50) || 'guest';

    let platform = 'Khác';
    let affiliateUrl = '';

    if (expandedUrl.includes('shopee.vn') || expandedUrl.includes('shp.ee') || expandedUrl.includes('shope.ee')) {
      platform = 'Shopee';
      const baseProductUrl = expandedUrl.split('?')[0];
      const encodedOrigin = encodeURIComponent(baseProductUrl);
      affiliateUrl = `https://s.shopee.vn/an_redir?origin_link=${encodedOrigin}&affiliate_id=${SHOPEE_AFFILIATE_ID}&sub_id=${cleanSubId}`;
    } 
    else if (expandedUrl.includes('tiktok.com')) {
      platform = 'TikTok Shop';
      const sourceId = 'Publisher Coupon'; 
      // Khi đã giải mã ra link chuẩn của TikTok, đưa vào Isclix sẽ không bao giờ bị 404 nữa
      const encodedTargetUrl = encodeURIComponent(expandedUrl);
      affiliateUrl = `https://go.isclix.com/deep_link?url=${encodedTargetUrl}&utm_source=${sourceId}&sub_id=${cleanSubId}`;
    }
    else if (expandedUrl.includes('lazada.vn') || expandedUrl.includes('s.lazada.vn')) {
      platform = 'Lazada';
      const baseUrl = expandedUrl.split('?')[0];
      affiliateUrl = `${baseUrl}?laz_aff_id=${LAZADA_AFFILIATE_ID}&sub_id=${cleanSubId}`;
    }
    else {
      platform = 'Sàn khác';
      const sourceId = 'Publisher Coupon';
      const encodedUrl = encodeURIComponent(expandedUrl);
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