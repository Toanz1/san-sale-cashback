import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CAMLINK_API_KEY =
  process.env.CAMLINK_API_KEY ||
  'clk_live_32frrc3Ur8Ruon6nwZGOLpeFBvjdodadTwAQGlds8W544JzB';

// Hàm mở link rút gọn (vn.shp.ee, shp.ee, s.shopee.vn, vt.tiktok.com) để lấy link shopee.vn gốc
async function resolveRedirectUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    return res.url || url;
  } catch (e) {
    return url;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const rawUrl = body.originalUrl || body.url;
    const userId = body.userId || 'guest';

    if (!rawUrl || !rawUrl.trim().startsWith('http')) {
      return NextResponse.json(
        { error: 'Vui lòng nhập link hợp lệ (bắt đầu bằng http hoặc https)' },
        { status: 400 }
      );
    }

    let cleanUrl = rawUrl.trim();

    // 1. Nếu là dạng link rút gọn, tự động giải mã ra URL shopee.vn thực tế
    if (
      cleanUrl.includes('shp.ee') ||
      cleanUrl.includes('s.shopee.vn') ||
      cleanUrl.includes('shope.ee') ||
      cleanUrl.includes('vt.tiktok.com')
    ) {
      cleanUrl = await resolveRedirectUrl(cleanUrl);
    }

    // Làm sạch sub_id theo đúng chuẩn Camlink (chữ không dấu, số, gạch ngang, gạch dưới, tối đa 100 ký tự)
    const cleanSubId = String(userId)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 80) || 'guest';

    // 2. Nhận diện nền tảng
    let platform = 'Khác';
    if (cleanUrl.includes('shopee.vn') || cleanUrl.includes('shope.ee')) {
      platform = 'Shopee';
    } else if (cleanUrl.includes('lazada.vn')) {
      platform = 'Lazada';
    } else if (cleanUrl.includes('tiktok.com')) {
      platform = 'TikTok';
    }

    let affiliateUrl = '';

    // ============================================================
    // GỌI CAMLINK CHO SHOPEE
    // ============================================================
    if (platform === 'Shopee') {
      const camlinkPayload = {
        original_links: [cleanUrl],
        sub_id_1: cleanSubId,
      };

      const camlinkRes = await fetch(
        'https://apicam.hoantienz.com/api/v1/affiliate/convert-link',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${CAMLINK_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(camlinkPayload),
        }
      );

      const data = await camlinkRes.json();

      if (!camlinkRes.ok || !data.success) {
        console.error('Lỗi Camlink phản hồi:', data);
        const errorMsg =
          data?.error?.message ||
          (data?.error?.code === 'VALIDATION_ERROR'
            ? 'Định dạng link chưa tương thích hoặc kết nối Shopee chưa sẵn sàng'
            : 'Camlink từ chối chuyển đổi link');
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }

      const batchList = data?.data?.data?.batchCustomLink;
      if (batchList && batchList.length > 0) {
        affiliateUrl = batchList[0].shortLink || batchList[0].longLink;
      }

      if (!affiliateUrl) {
        return NextResponse.json(
          { error: 'Không nhận được đường dẫn tiếp thị từ Camlink' },
          { status: 400 }
        );
      }
    } 
    // ============================================================
    // LAZADA / TIKTOK
    // ============================================================
    else {
      const urlBeforeParams = cleanUrl.split('?')[0];
      const encodedUrl = encodeURIComponent(urlBeforeParams);
      const MO_PARTNER_CODE = process.env.NEXT_PUBLIC_MASOFFER_ID || 'masoffer_id';
      affiliateUrl = `https://go.masoffer.net/v0/${MO_PARTNER_CODE}/?go=${encodedUrl}&traffic_id=${cleanSubId}`;
    }

    // ============================================================
    // LƯU SUPABASE (NẾU ĐĂNG NHẬP)
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
    console.error('Lỗi Server Convert:', err);
    return NextResponse.json(
      { error: 'Hệ thống đang bận, vui lòng thử lại sau!' },
      { status: 500 }
    );
  }
}