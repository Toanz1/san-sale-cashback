import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

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

      try {
        const atRes = await fetch('https://api.accesstrade.vn/v1/custom_links', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${apiKey}`
          },
          body: JSON.stringify({
            url: originalUrl,
            utm_source: subId
          })
        });
        const atData = await atRes.json();
        
        if (atData && atData.data && (atData.data.short_url || atData.data.url)) {
          affiliateUrl = atData.data.short_url || atData.data.url;
        } else {
          // Xử lý sạch link gốc bằng cách cắt bỏ các tham số rác đằng sau dấu ? để chống lỗi 404
          const cleanUrl = originalUrl.split('?')[0];
          affiliateUrl = `https://go.isclix.com/deep_link?url=${encodeURIComponent(cleanUrl)}&utm_source=Publisher%20Coupon&sub_id=${subId}`;
        }
      } catch (err) {
        console.error('Lỗi API Accesstrade TikTok:', err);
        const cleanUrl = originalUrl.split('?')[0];
        affiliateUrl = `https://go.isclix.com/deep_link?url=${encodeURIComponent(cleanUrl)}&utm_source=Publisher%20Coupon&sub_id=${subId}`;
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