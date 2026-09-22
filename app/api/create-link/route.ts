import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const TIKTOK_CAMPAIGN_ID = '6648523843406889655'; // Campaign ID TikTok Shop của bạn

export async function POST(req: Request) {
  try {
    const { originalUrl, userId, userCode } = await req.json();

    if (!originalUrl) {
      return NextResponse.json({ success: false, error: 'Vui lòng cung cấp link sản phẩm' }, { status: 400 });
    }

    let platform = 'Shopee';
    let affiliateUrl = originalUrl;
    const subId = userCode || userId || 'guest';

    // 1. Nhận diện sàn và tạo link tương ứng
    if (originalUrl.includes('shopee.vn') || originalUrl.includes('s.shopee.vn')) {
      platform = 'Shopee';
      affiliateUrl = `https://s.shopee.vn/universal-link?url=${encodeURIComponent(originalUrl)}&sub_id=${subId}`;
    } 
    else if (originalUrl.includes('lazada.vn') || originalUrl.includes('lazada.com')) {
      platform = 'Lazada (Trực tiếp)';
      const lazadaId = '264211329';
      affiliateUrl = `https://s.lazada.vn/s.${lazadaId}?sub_id=${subId}&url=${encodeURIComponent(originalUrl)}`;
    } 
    else if (originalUrl.includes('tiktok.com') || originalUrl.includes('vt.tiktok.com') || originalUrl.includes('shop.tiktok')) {
      platform = 'TikTok Shop (Accesstrade)';
      const apiKey = process.env.ACCESSTRADE_API_KEY;

      let rawAffiliateUrl = originalUrl;

      try {
        // Dùng đúng endpoint chuẩn product_link/create của Accesstrade kèm tiền tố 'token' viết thường
        const atRes = await fetch('https://api.accesstrade.vn/v1/product_link/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${apiKey}`
          },
          body: JSON.stringify({
            campaign_id: TIKTOK_CAMPAIGN_ID,
            urls: [originalUrl],
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

      // Nếu API không trả về, dùng link go.isclix.com dạng sạch
      if (!rawAffiliateUrl || rawAffiliateUrl === originalUrl) {
        const cleanUrl = originalUrl.split('?')[0];
        rawAffiliateUrl = `https://go.isclix.com/deep_link?url=${encodeURIComponent(cleanUrl)}&utm_source=Publisher%20Coupon&sub_id=${subId}`;
      }

      // Tự động rút gọn link dài thành link ngắn gọn chuyên nghiệp (is.gd)
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

    // 2. Lưu lịch sử tạo link vào Supabase
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