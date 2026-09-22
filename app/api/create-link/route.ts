import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const TIKTOK_CAMPAIGN_ID = '6648523843406889655'; // Campaign ID TikTok Shop của bạn

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

export async function POST(req: Request) {
  try {
    const { originalUrl, userId, userCode } = await req.json();

    if (!originalUrl) {
      return NextResponse.json({ success: false, error: 'Vui lòng cung cấp link sản phẩm' }, { status: 400 });
    }

    let platform = 'Shopee';
    let affiliateUrl = originalUrl;
    const subId = userCode || userId || 'guest';

    // 1. Giải mã link nếu là dạng rút gọn (ví dụ: tiktok.com/t/...) trước khi xử lý
    const expandedUrl = await expandShortUrl(originalUrl.trim());

    // 2. Nhận diện sàn và tạo link tương ứng
    if (expandedUrl.includes('shopee.vn') || expandedUrl.includes('s.shopee.vn')) {
      platform = 'Shopee';
      affiliateUrl = `https://s.shopee.vn/universal-link?url=${encodeURIComponent(expandedUrl)}&sub_id=${subId}`;
    } 
    else if (expandedUrl.includes('lazada.vn') || expandedUrl.includes('lazada.com')) {
      platform = 'Lazada (Trực tiếp)';
      const lazadaId = '264211329';
      affiliateUrl = `https://s.lazada.vn/s.${lazadaId}?sub_id=${subId}&url=${encodeURIComponent(expandedUrl)}`;
    } 
    else if (expandedUrl.includes('tiktok.com') || expandedUrl.includes('vt.tiktok.com') || expandedUrl.includes('shop.tiktok')) {
      platform = 'TikTok Shop (Accesstrade)';
      const apiKey = process.env.ACCESSTRADE_API_KEY;

      let rawAffiliateUrl = expandedUrl;

      try {
        // Gọi API tạo link chuẩn của Accesstrade bằng link đã được mở rộng
        const atRes = await fetch('https://api.accesstrade.vn/v1/product_link/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${apiKey}`
          },
          body: JSON.stringify({
            campaign_id: TIKTOK_CAMPAIGN_ID,
            urls: [expandedUrl],
            utm_source: subId
          })
        });
        const atData = await atRes.json();
        
        if (atData && atData.data) {
          if (Array.isArray(atData.data) && atData.data.length > 0) {
            rawAffiliateUrl = atData.data[0].short_url || atData.data[0].aff_short_url || atData.data[0].url || atData.data[0].aff_url;
          } else if (atData.data.short_url || atData.data.url || atData.data.aff_short_url) {
            rawAffiliateUrl = atData.data.short_url || atData.data.url || atData.data.aff_short_url;
          }
        }
      } catch (err) {
        console.error('Lỗi API Accesstrade TikTok:', err);
      }

      // Nếu API không trả về, dùng link go.isclix.com với link đã làm sạch tham số rác
      if (!rawAffiliateUrl || rawAffiliateUrl === expandedUrl) {
        const cleanUrl = expandedUrl.split('?')[0];
        rawAffiliateUrl = `https://go.isclix.com/deep_link?url=${encodeURIComponent(cleanUrl)}&utm_source=Publisher%20Coupon&sub_id=${subId}`;
      }

      // Tự động rút gọn link trả về qua is.gd để link gọn gàng chuyên nghiệp
      try {
        const shortRes = await fetch(`https://is.gd/create.gif?format=simple&url=${encodeURIComponent(rawAffiliateUrl)}`);
        if (shortRes.ok) {
          const shortText = await shortRes.text();
          if (shortText && shortText.startsWith('http')) {
            affiliateUrl = shortText.trim();
          } else {
            affiliateUrl = rawAffiliateUrl;
          }
        } else {
          affiliateUrl = rawAffiliateUrl;
        }
      } catch (shortErr) {
        affiliateUrl = rawAffiliateUrl;
      }
    }

    // 3. Lưu lịch sử tạo link vào Supabase
    if (userId && userId !== 'guest') {
      await supabase.from('link_history').insert([
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