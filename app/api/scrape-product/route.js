import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url || (!url.includes('shopee.vn') && !url.includes('s.shopee.vn'))) {
      return NextResponse.json({ error: 'Vui lòng nhập link Shopee hợp lệ' }, { status: 400 });
    }

    const apiKey = process.env.SCRAPER_API_KEY || 'a8aad209b24fb9c0ba97238f1eff3760';
    let targetUrl = url.trim();

    // 1. Giải mã link rút gọn s.shopee.vn sang link gốc
    if (targetUrl.includes('s.shopee.vn')) {
      try {
        const expandRes = await fetch(targetUrl, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (expandRes.url && expandRes.url.includes('shopee.vn')) {
          targetUrl = expandRes.url;
        }
      } catch (e) {
        console.error('Không thể tự giải nén s.shopee.vn:', e);
      }
    }

    // Cắt bỏ query params dư thừa để lấy link sản phẩm chuẩn
    const cleanUrl = targetUrl.split('?')[0];

    // 2. Gửi sang ScraperAPI
    const scraperUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(cleanUrl)}&render=true&country_code=vn`;
    const res = await fetch(scraperUrl);
    const html = await res.text();

    // 3. Bóc tách hình ảnh
    let image = '';
    const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
    if (imgMatch && imgMatch[1]) {
      image = imgMatch[1];
    }

    // 4. Bóc tách tiêu đề
    let name = '';
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);
    if (titleMatch && titleMatch[1]) {
      name = titleMatch[1].replace(/ \| Shopee Việt Nam/gi, '').trim();
    }

    // 5. Bóc tách giá bán
    let price = 0;
    const priceMetaMatch = html.match(/<meta\s+property=["']product:price:amount["']\s+content=["'](.*?)["']/i);
    if (priceMetaMatch && priceMetaMatch[1]) {
      price = Number(priceMetaMatch[1]);
    } else {
      const schemaMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
      if (schemaMatch && schemaMatch[1]) {
        try {
          const schemaData = JSON.parse(schemaMatch[1]);
          price = Number(schemaData.offers?.price || schemaData.offers?.lowPrice || 0);
        } catch {}
      }
    }

    // Kiểm tra tính hợp lệ của dữ liệu
    if (!name && !image) {
      return NextResponse.json({
        error: 'Không trích xuất được thông tin từ link này. Hãy thử dán link sản phẩm gốc (dạng shopee.vn/product/...).'
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      name,
      image,
      price: price > 0 ? price : 0,
      cleanUrl
    });
  } catch (error) {
    console.error('Lỗi scrape:', error);
    return NextResponse.json({ error: 'Không thể kết nối máy chủ bóc tách dữ liệu' }, { status: 500 });
  }
}