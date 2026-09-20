import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'Vui lòng cung cấp link Shopee' }, { status: 400 });
    }

    const apiKey = process.env.SCRAPER_API_KEY || 'a8aad209b24fb9c0ba97238f1eff3760';
    let targetUrl = url.trim();

    // 1. Mở rộng link rút gọn nếu là s.shopee.vn
    if (targetUrl.includes('s.shopee.vn')) {
      try {
        const resShort = await fetch(targetUrl, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (resShort.url) targetUrl = resShort.url;
      } catch (e) {
        console.error('Lỗi giải mã s.shopee:', e);
      }
    }

    const decoded = decodeURIComponent(targetUrl);

    // 2. Tìm shopid và itemid
    let shopId = null;
    let itemId = null;

    // Định dạng: -i.12345.67890
    const match1 = decoded.match(/-i\.(\d+)\.(\d+)/);
    if (match1) {
      shopId = match1[1];
      itemId = match1[2];
    } else {
      // Định dạng: product/12345/67890
      const match2 = decoded.match(/product\/(\d+)\/(\d+)/);
      if (match2) {
        shopId = match2[1];
        itemId = match2[2];
      }
    }

    // 3. Gọi API v2 của Shopee thông qua ScraperAPI
    if (shopId && itemId) {
      const shopeeApi = `https://shopee.vn/api/v2/item/get?itemid=${itemId}&shopid=${shopId}`;
      const scraperUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(shopeeApi)}&keep_headers=true&country_code=vn`;

      try {
        const apiRes = await fetch(scraperUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': `https://shopee.vn/product/${shopId}/${itemId}`,
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        const data = await apiRes.json();
        const item = data?.item;

        if (item) {
          const name = item.name || '';
          const image = item.image ? `https://down-vn.img.susercontent.com/file/${item.image}` : '';
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
        console.error('Lỗi API v2:', err);
      }
    }

    // 4. Nếu không lấy được qua API, cào meta bằng chế độ render JavaScript
    const scrapePageUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(decoded)}&render=true&country_code=vn`;
    const pageRes = await fetch(scrapePageUrl);
    const html = await pageRes.text();

    const imgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["'](.*?)["']/i);
    const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["'](.*?)["']/i);

    let name = titleMatch ? titleMatch[1].replace(/ \| Shopee Việt Nam/gi, '').trim() : '';
    let image = imgMatch ? imgMatch[1] : '';

    let price = 0;
    const priceMatch = html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["'](.*?)["']/i);
    if (priceMatch) {
      price = Number(priceMatch[1]);
    }

    if (name || image) {
      return NextResponse.json({
        success: true,
        name,
        image,
        price,
        originalPrice: 0
      });
    }

    return NextResponse.json({
      error: 'Shopee đang bật bảo vệ CAPTCHA. Bạn vui lòng copy tên, giá và link ảnh điền tay giúp mình nhé!'
    }, { status: 422 });

  } catch (error) {
    console.error('Lỗi route scrape:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống khi quét dữ liệu' }, { status: 500 });
  }
}