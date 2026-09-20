import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url || (!url.includes('shopee.vn') && !url.includes('s.shopee.vn'))) {
      return NextResponse.json({ error: 'Vui lòng nhập link Shopee hợp lệ' }, { status: 400 });
    }

    const apiKey = process.env.SCRAPER_API_KEY || 'a8aad209b24fb9c0ba97238f1eff3760';
    let rawUrl = url.trim();

    // 1. Xử lý giải mã link rút gọn s.shopee.vn
    if (rawUrl.includes('s.shopee.vn')) {
      try {
        const expandRes = await fetch(rawUrl, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (expandRes.url) rawUrl = expandRes.url;
      } catch (e) {
        console.error('Lỗi giải mã s.shopee.vn:', e);
      }
    }

    // Decode URL để đọc được tiếng Việt và cấu trúc id
    const decodedUrl = decodeURIComponent(rawUrl);

    // 2. Tìm shopid và itemid bằng Regex
    // Dạng 1: shopee.vn/...-i.123456.789012
    // Dạng 2: shopee.vn/product/123456/789012
    let shopId = null;
    let itemId = null;

    const pattern1 = /-i\.(\d+)\.(\d+)/;
    const match1 = decodedUrl.match(pattern1);
    if (match1) {
      shopId = match1[1];
      itemId = match1[2];
    } else {
      const pattern2 = /product\/(\d+)\/(\d+)/;
      const match2 = decodedUrl.match(pattern2);
      if (match2) {
        shopId = match2[1];
        itemId = match2[2];
      }
    }

    // CÁCH 1: Nếu trích xuất được shopId & itemId -> Gọi API dữ liệu chính thống của Shopee qua ScraperAPI
    if (shopId && itemId) {
      const shopeeApiUrl = `https://shopee.vn/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;
      const proxyApiUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(shopeeApiUrl)}&country_code=vn`;

      try {
        const apiRes = await fetch(proxyApiUrl);
        const apiJson = await apiRes.json();

        if (apiJson?.data) {
          const item = apiJson.data;
          const name = item.name || '';
          const image = item.image ? `https://down-vn.img.susercontent.com/file/${item.image}` : '';
          // Giá Shopee lưu dạng x100,000 (chia cho 100,000 để ra VNĐ)
          const price = item.price ? Math.round(item.price / 100000) : 0;
          const originalPrice = item.price_before_discount ? Math.round(item.price_before_discount / 100000) : 0;

          return NextResponse.json({
            success: true,
            name,
            image,
            price,
            originalPrice
          });
        }
      } catch (err) {
        console.error('Lỗi khi gọi API Shopee, chuyển sang quét HTML dự phòng:', err);
      }
    }

    // CÁCH 2: DỰ PHÒNG - Quét toàn bộ HTML gốc nguyên bản
    const proxyHtmlUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(rawUrl)}&render=true&country_code=vn`;
    const res = await fetch(proxyHtmlUrl);
    const html = await res.text();

    // Bóc tách OpenGraph
    const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
    const image = imgMatch ? imgMatch[1] : '';

    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);
    let name = titleMatch ? titleMatch[1].replace(/ \| Shopee Việt Nam/gi, '').trim() : '';

    let price = 0;
    const priceMetaMatch = html.match(/<meta\s+property=["']product:price:amount["']\s+content=["'](.*?)["']/i);
    if (priceMetaMatch) {
      price = Number(priceMetaMatch[1]);
    } else {
      const schemaMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
      if (schemaMatch) {
        try {
          const schemaData = JSON.parse(schemaMatch[1]);
          price = Number(schemaData.offers?.price || schemaData.offers?.lowPrice || 0);
        } catch {}
      }
    }

    if (!name && !image) {
      return NextResponse.json({
        error: 'Không tìm thấy dữ liệu sản phẩm. Vui lòng kiểm tra lại link hoặc nhập tay.'
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      name,
      image,
      price: price > 0 ? price : 0,
      originalPrice: 0
    });
  } catch (error) {
    console.error('Lỗi scrape:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi quét dữ liệu' }, { status: 500 });
  }
}