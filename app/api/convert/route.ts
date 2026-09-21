import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SHOPEE_AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID || '17361810588';
const LAZADA_AFFILIATE_ID = process.env.LAZADA_AFFILIATE_ID || '264211329';
const ACCESSTRADE_API_TOKEN = process.env.ACCESSTRADE_API_KEY || 'CSzqKa6JWAVuQszd8uelhNZfZAPYsI3e';

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

    // Làm sạch sub_id / utm_source để tracking hoa hồng
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
    // ==========================================
    // 3. XỬ LÝ TIKTOK SHOP (Gọi API AccessTrade & Xử lý fallback an toàn)
    // ==========================================
    else if (expandedUrl.includes('tiktok.com')) {
      platform = 'TikTok Shop';

      try {
        const atRes = await fetch('https://api.accesstrade.vn/v1/product_link/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${ACCESSTRADE_API_TOKEN}`
          },
          body: JSON.stringify({
            url: expandedUrl,
            utm_source: cleanSubId
          })
        });

        const atData: any = await atRes.json();
        
        // Kiểm tra đúng cấu trúc trả về từ AccessTrade API
        if (atData && atData.success && atData.data) {
          affiliateUrl = atData.data; // Thường AccessTrade trả về link rút gọn trực tiếp trong `data`
        } else if (atData && (atData.short_url || atData.data?.short_url)) {
          affiliateUrl = atData.short_url || atData.data.short_url;
        } else {
          // Fallback an toàn: Giữ nguyên link gốc sản phẩm kèm sub_id thay vì dùng link api chết
          const separator = expandedUrl.includes('?') ? '&' : '?';
          affiliateUrl = `${expandedUrl}${separator}sub_id=${cleanSubId}`;
        }
      } catch (err) {
        console.error('Lỗi API AccessTrade:', err);
        // Fallback an toàn khi lỗi mạng
        const separator = expandedUrl.includes('?') ? '&' : '?';
        affiliateUrl = `${expandedUrl}${separator}sub_id=${cleanSubId}`;
      }
    }
    // ==========================================
    // 4. XỬ LÝ CÁC TRƯỜNG HỢP CÒN LẠI (DỰ PHÒNG)
    // ==========================================
    else {
      platform = 'Website khác';
      const encodedUrl = encodeURIComponent(expandedUrl);
      affiliateUrl = `https://shorten.asia/api/click?url=${encodedUrl}&publisher_id=${ACCESSTRADE_API_TOKEN}&sub_id=${cleanSubId}`;
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