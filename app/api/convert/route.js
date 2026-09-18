import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { rawUrl, userId } = await req.json();
    if (!rawUrl) {
      return NextResponse.json({ error: 'URL không hợp lệ' }, { status: 400 });
    }

    const trafficId = process.env.MASOFFER_TRAFFIC_ID || 'DEMO_ID';
    const cleanUrl = rawUrl.trim();
    const encodedUrl = encodeURIComponent(cleanUrl);
    
    // Ghép tham số aff_sub1 bằng ID của người dùng trên web
    // MasOffer format: https://go.masoffer.net/v1/{TRAFFIC_ID}?url={URL}&aff_sub1={USER_ID}
    const subParam = userId ? `&aff_sub1=${userId}` : '';
    const affiliateUrl = `https://go.masoffer.net/v1/${trafficId}?url=${encodedUrl}${subParam}`;

    return NextResponse.json({ affiliateUrl });
  } catch (err) {
    return NextResponse.json({ error: 'Lỗi chuyển đổi link' }, { status: 500 });
  }
}