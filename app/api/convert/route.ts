import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SHOPEE_AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID || '17361810588';
const LAZADA_AFFILIATE_ID = process.env.LAZADA_AFFILIATE_ID || '264211329';

// Hàm mở rộng link rút gọn (TikTok, Shopee, Lazada)
async function expandShortUrl(url: string): Promise<string> {
  try {
    if (url.includes('vt.tiktok.com') || url.includes('tiktok.com/t/') || url.includes('shp.ee') || url.includes('s.shopee.vn') || url.includes('s.lazada.vn')) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        method: 'GET',
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
  } catch (e: any) {
    console.error('Lỗi giải mã link rút gọn:', e.message);
  }
  return url;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawUrl = body.originalUrl || body.url || '';
    const userId = body.userId || 'guest';

    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim().startsWith('http')) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đường link hợp lệ (bắt đầu bằng http:// hoặc https://)' },
        { status: 400 }
      );
    }

    const cleanUrl = rawUrl.trim();
    const expandedUrl = await expandShortUrl(cleanUrl);

    // Làm sạch sub_id để tracking hoa hồng theo tài khoản thành viên
    const cleanSubId = String(userId)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50) || 'guest';

    let platform = 'Khác';
    let affiliateUrl = '';

    // ==========================================
    // 1. XỬ LÝ SHOPEE
    // ==========================================
    if (expandedUrl.includes('shopee.vn') || expandedUrl.includes('shp.ee') || expandedUrl.includes('shope.ee')) {
      platform = 'Shopee';
      const baseProductUrl = expandedUrl.split('?')[0];
      const encodedOrigin = encodeURIComponent(baseProductUrl);
      affiliateUrl = `https://s.shopee.vn/an_redir?origin_link=${encodedOrigin}&affiliate_id=${SHOPEE_AFFILIATE_ID}&sub_id=${cleanSubId}`;
    } 
    // ==========================================
    // 2. XỬ LÝ LAZADA
    // ==========================================
    else if (expandedUrl.includes('lazada.vn') || expandedUrl.includes('s.lazada.vn')) {
      platform = 'Lazada';
      const baseUrl = expandedUrl.split('?')[0];
      affiliateUrl = `${baseUrl}?laz_aff_id=${LAZADA_AFFILIATE_ID}&sub_id=${cleanSubId}`;
    } 
    // ==========================================
    // 3. XỬ LÝ TIKTOK SHOP (Kết nối qua hệ thống Deep Link của AccessTrade)
    // ==========================================
    else if (expandedUrl.includes('tiktok.com')) {
      platform = 'TikTok Shop';
      
      let cleanTikTokUrl = expandedUrl;
      const match = expandedUrl.match(/\/pdp\/(\d+)/);
      if (match && match[1]) {
        cleanTikTokUrl = `https://shop.tiktok.com/vn/pdp/${match[1]}`;
      } else {
        cleanTikTokUrl = expandedUrl.split('?')[0];
      }

      const encodedTargetUrl = encodeURIComponent(cleanTikTokUrl);
      affiliateUrl = `https://go.isclix.com/deep_link?url=${encodedTargetUrl}&utm_source=${cleanSubId}`;
    }
    // ==========================================
    // 4. CÁC TRƯỜNG HỢP CÒN LẠI
    // ==========================================
    else {
      platform = 'Website khác';
      const encodedTargetUrl = encodeURIComponent(expandedUrl);
      affiliateUrl = `https://go.isclix.com/deep_link?url=${encodedTargetUrl}&utm_source=${cleanSubId}`;
    }
       
    // Lưu lịch sử vào Supabase
    if (userId && userId !== 'guest') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
        image: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a'
      }
    });
  } catch (err: any) {
    console.error('Lỗi xử lý Convert:', err);
    return NextResponse.json(
      { error: 'Hệ thống chuyển đổi link tạm thời bận, vui lòng thử lại!' },
      { status: 500 }
    );
  }
}