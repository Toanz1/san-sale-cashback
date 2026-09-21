import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SHOPEE_AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID || '17361810588';
const LAZADA_AFFILIATE_ID = process.env.LAZADA_AFFILIATE_ID || '264211329';

// Hàm mở rộng link rút gọn TikTok/Shopee
async function expandShortUrl(url: string): Promise<string> {
  try {
    if (url.includes('vt.tiktok.com') || url.includes('tiktok.com/t/') || url.includes('shp.ee') || url.includes('s.shopee.vn')) {
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

// Hàm rút gọn link dài thành link ngắn gọn
async function shortenUrl(longUrl: string): Promise<string> {
  try {
    const res = await fetch(`https://is.gd/create.gif?format=simple&url=${encodeURIComponent(longUrl)}`);
    if (res.ok) {
      const short = await res.text();
      if (short && short.startsWith('http')) {
        return short.trim();
      }
    }
  } catch (e) {
    console.error('Lỗi rút gọn link, giữ nguyên link dài:', e);
  }
  return longUrl;
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

    const cleanSubId = String(userId)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50) || 'guest';

    let platform = 'Khác';
    let rawAffiliateUrl = '';

    // 1. SHOPEE: Dùng link chuyển hướng chính chủ của Shopee
    if (expandedUrl.includes('shopee.vn') || expandedUrl.includes('shp.ee') || expandedUrl.includes('shope.ee')) {
      platform = 'Shopee';
      const baseProductUrl = expandedUrl.split('?')[0];
      const encodedOrigin = encodeURIComponent(baseProductUrl);
      rawAffiliateUrl = `https://s.shopee.vn/an_redir?origin_link=${encodedOrigin}&affiliate_id=${SHOPEE_AFFILIATE_ID}&sub_id=${cleanSubId}`;
    } 
   // 2. TIKTOK SHOP: Sử dụng đúng cấu trúc Deeplink chuẩn của AccessTrade
    else if (expandedUrl.includes('tiktok.com')) {
      platform = 'TikTok Shop';
      
      const PUBLISHER_ID = '5578920077038237672';
      const CAMPAIGN_ID = '6648523843406889655';
      
      // Dùng encodeURIComponent chuẩn để tránh lỗi ký tự đặc biệt trên Serverless
      const encodedUrl = encodeURIComponent(expandedUrl);
      
      rawAffiliateUrl = `https://go.isclix.com/deep_link/v6/${PUBLISHER_ID}/${CAMPAIGN_ID}?sub4=${cleanSubId}&url_enc=${encodedUrl}`;
    }
    // 3. LAZADA: Dùng ID tiếp thị của Lazada
    else if (expandedUrl.includes('lazada.vn') || expandedUrl.includes('s.lazada.vn')) {
      platform = 'Lazada';
      const baseUrl = expandedUrl.split('?')[0];
      rawAffiliateUrl = `${baseUrl}?laz_aff_id=${LAZADA_AFFILIATE_ID}&sub_id=${cleanSubId}`;
    }
    // 4. CÁC SÀN KHÁC
    else {
      platform = 'Sàn khác';
      rawAffiliateUrl = `https://go.isclix.com/deep_link?url=${encodeURIComponent(expandedUrl)}&sub_id=${cleanSubId}`;
    }

    // Tiến hành rút gọn link cuối cùng
    const affiliateUrl = await shortenUrl(rawAffiliateUrl);

    // Lưu lịch sử vào Supabase
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
  } catch (err: any) {
    console.error('Lỗi xử lý Convert:', err);
    return NextResponse.json(
      { error: 'Hệ thống chuyển đổi link tạm thời bận, vui lòng thử lại!' },
      { status: 500 }
    );
  }
}