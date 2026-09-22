import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const TIKTOK_CAMPAIGN_ID = '6648523843406889655';
const ACCESSTRADE_API_KEY = process.env.ACCESSTRADE_API_KEY || 'CSzqKa6JWAVuQszd8uelhNZfZAPYsI3e';

// Hàm giải mã link rút gọn TikTok/Shopee/Lazada thành link đầy đủ
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

// Hàm rút gọn link dự phòng qua is.gd
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
    console.error('Lỗi rút gọn link:', e);
  }
  return longUrl;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const originalUrl = body.originalUrl || body.url || '';
    const userId = body.userId || 'guest';
    const userCode = body.userCode || '';

    if (!originalUrl) {
      return NextResponse.json({ success: false, error: 'Vui lòng cung cấp link sản phẩm' }, { status: 400 });
    }

    let platform = 'Shopee';
    let rawAffiliateUrl = originalUrl;
    const subId = userCode || userId || 'guest';

    // 1. Giải mã link nếu là dạng rút gọn trước khi xử lý
    const expandedUrl = await expandShortUrl(originalUrl.trim());

    // 2. Nhận diện sàn và tạo link tương ứng
    if (expandedUrl.includes('shopee.vn') || expandedUrl.includes('s.shopee.vn') || expandedUrl.includes('shp.ee')) {
      platform = 'Shopee';
      const baseProductUrl = expandedUrl.split('?')[0];
      rawAffiliateUrl = `https://s.shopee.vn/an_redir?origin_link=${encodeURIComponent(baseProductUrl)}&sub_id=${subId}`;
    } 
    else if (expandedUrl.includes('lazada.vn') || expandedUrl.includes('s.lazada.vn')) {
      platform = 'Lazada';
      const baseUrl = expandedUrl.split('?')[0];
      const lazadaId = '264211329';
      rawAffiliateUrl = `${baseUrl}?laz_aff_id=${lazadaId}&sub_id=${subId}`;
    } 
    else if (expandedUrl.includes('tiktok.com') || expandedUrl.includes('vt.tiktok.com') || expandedUrl.includes('shop.tiktok')) {
      platform = 'TikTok Shop';
      
      let cleanTikTokUrl = expandedUrl;
      const match = expandedUrl.match(/\/pdp\/(\d+)/);
      if (match && match[1]) {
        cleanTikTokUrl = `https://shop.tiktok.com/vn/pdp/${match[1]}`;
      } else {
        cleanTikTokUrl = expandedUrl.split('?')[0];
      }

      try {
        // Gọi API tạo link chuẩn của Accesstrade
        const atRes = await fetch('https://api.accesstrade.vn/v1/product_link/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${ACCESSTRADE_API_KEY}`
          },
          body: JSON.stringify({
            campaign_id: TIKTOK_CAMPAIGN_ID,
            urls: [cleanTikTokUrl],
            utm_source: subId
          })
        });
        const atData = await atRes.json();
        
        if (atData && atData.data) {
          if (Array.isArray(atData.data) && atData.data.length > 0) {
            rawAffiliateUrl = atData.data[0].short_url || atData.data[0].aff_short_url || atData.data[0].url || atData.data[0].aff_url;
          } else if (atData.data.short_url || atData.data.url) {
            rawAffiliateUrl = atData.data.short_url || atData.data.url;
          }
        }
      } catch (err) {
        console.error('Lỗi API Accesstrade TikTok:', err);
      }

      // Nếu API không trả về, dùng link trạm trung chuyển go.isclix.com
      if (!rawAffiliateUrl || rawAffiliateUrl === expandedUrl) {
        const cleanUrlOnly = cleanTikTokUrl.split('?')[0];
        rawAffiliateUrl = `https://go.isclix.com/deep_link?url=${encodeURIComponent(cleanUrlOnly)}&utm_source=Publisher%20Coupon&sub_id=${subId}`;
      }
    } else {
      platform = 'Website khác';
      rawAffiliateUrl = `https://go.isclix.com/deep_link?url=${encodeURIComponent(expandedUrl)}&utm_source=Publisher%20Coupon&sub_id=${subId}`;
    }

    // 3. Tự động rút gọn link trả về qua is.gd để đảm bảo link luôn ngắn gọn, chuyên nghiệp
    const affiliateUrl = await shortenUrl(rawAffiliateUrl);

    // 4. Lưu lịch sử tạo link vào Supabase
    if (userId && userId !== 'guest') {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          const supabaseClient = supabase(supabaseUrl, supabaseKey); // Hoặc dùng client có sẵn của bạn
          await supabaseClient.from('link_history').insert([
            {
              user_id: userId,
              original_url: originalUrl,
              affiliate_url: affiliateUrl,
              platform: platform,
              status: 'pending',
              cashback_amount: 0
            }
          ]);
        }
      } catch (dbErr) {
        console.error('Lỗi lưu lịch sử supabase:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      platform,
      affiliateUrl
    });

  } catch (error: any) {
    console.error('Lỗi tạo link:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}