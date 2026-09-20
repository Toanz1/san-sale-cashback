import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url || (!url.includes('shopee.vn') && !url.includes('s.shopee.vn'))) {
      return NextResponse.json({ error: 'Vui lòng nhập link Shopee hợp lệ' }, { status: 400 });
    }

    const apiKey = process.env.SCRAPER_API_KEY || 'a8aad209b24fb9c0ba97238f1eff3760';

    // 1. Tự động giải mã link rút gọn s.shopee.vn nếu có
    let targetUrl = url.trim();
    if (targetUrl.includes('s.shopee.vn')) {
      try {
        const headRes = await fetch(targetUrl, { method: 'GET', redirect: 'follow' });
        targetUrl = headRes.url || targetUrl;
      } catch (e) {
        console.log('Không thể giải nén link rút gọn, thử quét trực tiếp');
      }
    }

    // Làm sạch link
    const cleanUrl = targetUrl.split('?')[0];

    // 2. Gửi request qua ScraperAPI
    const scraperUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(cleanUrl)}&render=true&country_code=vn`;

    const res = await fetch(scraperUrl);
    const html = await res.text();

    // Lấy ảnh từ meta OpenGraph
    const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
    const image = imgMatch ? imgMatch[1] : '';

    // Lấy tiêu đề sản phẩm
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);
    let name = titleMatch ? titleMatch[1].replace(/ \| Shopee Việt Nam/g, '').trim() : '';

    // Lấy giá bán
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
        } catch (e) {}
      }
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
    return NextResponse.json({ error: 'Không thể lấy thông tin sản phẩm lúc này' }, { status: 500 });
  }
}