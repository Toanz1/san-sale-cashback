import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url || !url.includes('shopee.vn')) {
      return NextResponse.json({ error: 'Vui lòng nhập link Shopee hợp lệ' }, { status: 400 });
    }

    const apiKey = process.env.SCRAPER_API_KEY || 'a8aad209b24fb9c0ba97238f1eff3760';

    // Cắt link sạch bỏ các tham số rác
    const cleanUrl = url.split('?')[0];

    // Gửi yêu cầu qua ScraperAPI với render JS và IP tại Việt Nam
    const scraperUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(cleanUrl)}&render=true&country_code=vn`;

    const res = await fetch(scraperUrl);
    const html = await res.text();

    // 1. Lấy ảnh đại diện từ thẻ OpenGraph
    const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
    const image = imgMatch ? imgMatch[1] : '';

    // 2. Lấy tiêu đề sản phẩm
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);
    const name = titleMatch ? titleMatch[1].replace(' | Shopee Việt Nam', '').trim() : '';

    // 3. Lấy giá sản phẩm (từ thẻ meta hoặc JSON-LD)
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
      originalUrl: cleanUrl
    });
  } catch (error) {
    console.error('Lỗi scrape:', error);
    return NextResponse.json({ error: 'Không thể lấy thông tin sản phẩm lúc này' }, { status: 500 });
  }
}