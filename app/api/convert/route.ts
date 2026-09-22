import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// =====================================================
// CONFIG
// =====================================================

const SHOPEE_AFFILIATE_ID =
  process.env.SHOPEE_AFFILIATE_ID || '';

const LAZADA_AFFILIATE_ID =
  process.env.LAZADA_AFFILIATE_ID || '';

const ACCESSTRADE_API_KEY =
  process.env.ACCESSTRADE_API_KEY || '';

const TIKTOK_CAMPAIGN_ID =
  process.env.TIKTOK_CAMPAIGN_ID ||
  '6648523843406889655';

// =====================================================
// EXPAND SHORT URL
// =====================================================

async function expandShortUrl(url: string): Promise<string> {
  const isShortUrl =
    url.includes('vt.tiktok.com') ||
    url.includes('tiktok.com/t/') ||
    url.includes('shp.ee') ||
    url.includes('shope.ee') ||
    url.includes('s.shopee.vn') ||
    url.includes('s.lazada.vn');

  if (!isShortUrl) {
    return url;
  }

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 8000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,

      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/120.0.0.0 Safari/537.36',

        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },

      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (
      response.url &&
      !response.url.includes('/404') &&
      !response.url.includes('error')
    ) {
      return response.url;
    }
  } catch (error) {
    console.error(
      'Lỗi giải mã short URL:',
      error instanceof Error
        ? error.message
        : error
    );
  } finally {
    clearTimeout(timeoutId);
  }

  return url;
}

// =====================================================
// SHORTEN URL
// =====================================================

async function shortenUrl(
  longUrl: string
): Promise<string> {
  try {
    const apiUrl =
      `https://is.gd/create.php?format=simple&url=` +
      encodeURIComponent(longUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(
        'is.gd trả HTTP:',
        response.status
      );

      return longUrl;
    }

    const shortUrl =
      (await response.text()).trim();

    if (shortUrl.startsWith('http')) {
      return shortUrl;
    }
  } catch (error) {
    console.error(
      'Lỗi rút gọn URL:',
      error instanceof Error
        ? error.message
        : error
    );
  }

  return longUrl;
}

// =====================================================
// CLEAN SUB ID
// =====================================================

function sanitizeSubId(
  userId: unknown
): string {
  const value = String(userId || 'guest');

  const cleaned = value
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50);

  return cleaned || 'guest';
}

// =====================================================
// DETECT PLATFORM
// =====================================================

function detectPlatform(
  url: string
): string {
  const lowerUrl = url.toLowerCase();

  if (
    lowerUrl.includes('shopee.vn') ||
    lowerUrl.includes('shp.ee') ||
    lowerUrl.includes('shope.ee') ||
    lowerUrl.includes('s.shopee.vn')
  ) {
    return 'Shopee';
  }

  if (
    lowerUrl.includes('lazada.vn') ||
    lowerUrl.includes('s.lazada.vn')
  ) {
    return 'Lazada';
  }

  if (
    lowerUrl.includes('tiktok.com') ||
    lowerUrl.includes('shop.tiktok')
  ) {
    return 'TikTok Shop';
  }

  return 'Website khác';
}

// =====================================================
// SHOPEE
// =====================================================

function createShopeeAffiliateUrl(
  expandedUrl: string,
  subId: string
): string {
  if (!SHOPEE_AFFILIATE_ID) {
    throw new Error(
      'Thiếu SHOPEE_AFFILIATE_ID'
    );
  }

  const baseProductUrl =
    expandedUrl.split('?')[0];

  const encodedOrigin =
    encodeURIComponent(baseProductUrl);

  return (
    `https://s.shopee.vn/an_redir` +
    `?origin_link=${encodedOrigin}` +
    `&affiliate_id=${encodeURIComponent(
      SHOPEE_AFFILIATE_ID
    )}` +
    `&sub_id=${encodeURIComponent(subId)}`
  );
}

// =====================================================
// LAZADA
// =====================================================

function createLazadaAffiliateUrl(
  expandedUrl: string,
  subId: string
): string {
  if (!LAZADA_AFFILIATE_ID) {
    throw new Error(
      'Thiếu LAZADA_AFFILIATE_ID'
    );
  }

  const baseUrl =
    expandedUrl.split('?')[0];

  return (
    `${baseUrl}` +
    `?laz_aff_id=${encodeURIComponent(
      LAZADA_AFFILIATE_ID
    )}` +
    `&sub_id=${encodeURIComponent(subId)}`
  );
}

// =====================================================
// TIKTOK PRODUCT URL
// =====================================================

function cleanTikTokProductUrl(
  expandedUrl: string
): string {
  const urlWithoutQuery =
    expandedUrl.split('?')[0];

  /*
   * Ví dụ:
   *
   * https://shop.tiktok.com/vn/pdp/123456789
   *
   * hoặc:
   *
   * https://www.tiktok.com/shop/.../pdp/123456789
   */

  const pdpMatch =
    expandedUrl.match(/\/pdp\/(\d+)/);

  if (pdpMatch?.[1]) {
    return (
      `https://shop.tiktok.com/vn/pdp/` +
      pdpMatch[1]
    );
  }

  return urlWithoutQuery;
}

// =====================================================
// ACCESSTRADE TIKTOK
// =====================================================

async function createTikTokAffiliateUrl(
  productUrl: string,
  subId: string
): Promise<string> {
  if (!ACCESSTRADE_API_KEY) {
    throw new Error(
      'Thiếu ACCESSTRADE_API_KEY trong Environment Variables'
    );
  }

  if (!TIKTOK_CAMPAIGN_ID) {
    throw new Error(
      'Thiếu TIKTOK_CAMPAIGN_ID'
    );
  }

  console.log(
    '========== ACCESSTRADE TIKTOK =========='
  );

  console.log(
    'Campaign ID:',
    TIKTOK_CAMPAIGN_ID
  );

  console.log(
    'Product URL:',
    productUrl
  );

  console.log(
    'UTM Source:',
    subId
  );

  const response = await fetch(
    'https://api.accesstrade.vn/v1/product_link/create',
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',

        Authorization:
          `token ${ACCESSTRADE_API_KEY}`,
      },

      body: JSON.stringify({
        campaign_id:
          TIKTOK_CAMPAIGN_ID,

        urls: [
          productUrl,
        ],

        utm_source:
          subId,
      }),

      cache: 'no-store',
    }
  );

  const responseText =
    await response.text();

  console.log(
    'AccessTrade HTTP:',
    response.status
  );

  console.log(
    'AccessTrade response:',
    responseText
  );

  if (!response.ok) {
    throw new Error(
      `AccessTrade HTTP ${response.status}: ${responseText}`
    );
  }

  let data: any;

  try {
    data = JSON.parse(
      responseText
    );
  } catch {
    throw new Error(
      `AccessTrade trả về dữ liệu không phải JSON: ${responseText}`
    );
  }

  console.log(
    'AccessTrade parsed:',
    JSON.stringify(data)
  );

  // ===================================================
  // TRƯỜNG HỢP data LÀ ARRAY
  // ===================================================

  if (
    Array.isArray(data?.data) &&
    data.data.length > 0
  ) {
    const item =
      data.data[0];

    const affiliateUrl =
      item.short_url ||
      item.aff_short_url ||
      item.url ||
      item.aff_url;

    if (affiliateUrl) {
      return affiliateUrl;
    }
  }

  // ===================================================
  // TRƯỜNG HỢP data LÀ OBJECT
  // ===================================================

  if (
    data?.data &&
    typeof data.data === 'object'
  ) {
    const affiliateUrl =
      data.data.short_url ||
      data.data.aff_short_url ||
      data.data.url ||
      data.data.aff_url;

    if (affiliateUrl) {
      return affiliateUrl;
    }
  }

  // ===================================================
  // MỘT SỐ RESPONSE CÓ THỂ ĐẶT URL Ở ROOT
  // ===================================================

  const rootAffiliateUrl =
    data?.short_url ||
    data?.aff_short_url ||
    data?.url ||
    data?.aff_url;

  if (rootAffiliateUrl) {
    return rootAffiliateUrl;
  }

  // ===================================================
  // KHÔNG CÓ LINK
  // ===================================================

  throw new Error(
    `AccessTrade không trả về affiliate URL. Response: ${responseText}`
  );
}

// =====================================================
// WEBSITE KHÁC
// =====================================================

function createOtherAffiliateUrl(
  expandedUrl: string,
  subId: string
): string {
  return (
    `https://go.isclix.com/deep_link` +
    `?url=${encodeURIComponent(
      expandedUrl
    )}` +
    `&utm_source=Publisher%20Coupon` +
    `&sub_id=${encodeURIComponent(subId)}`
  );
}

// =====================================================
// SUPABASE
// =====================================================

async function saveLinkHistory(
  userId: string,
  originalUrl: string,
  affiliateUrl: string,
  platform: string
) {
  if (
    !userId ||
    userId === 'guest'
  ) {
    return;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey
  ) {
    console.warn(
      'Thiếu Supabase environment variables'
    );

    return;
  }

  try {
    const supabase =
      createClient(
        supabaseUrl,
        supabaseKey
      );

    const { error } =
      await supabase
        .from('link_history')
        .insert({
          user_id: userId,

          original_url:
            originalUrl,

          affiliate_url:
            affiliateUrl,

          platform:
            platform,
        });

    if (error) {
      console.error(
        'Lỗi lưu link_history:',
        error
      );
    }
  } catch (error) {
    console.error(
      'Lỗi Supabase:',
      error
    );
  }
}

// =====================================================
// POST
// =====================================================

export async function POST(
  req: Request
) {
  try {
    // =================================================
    // READ BODY
    // =================================================

    const body =
      await req.json();

    const rawUrl =
      body?.originalUrl ||
      body?.url ||
      '';

    const userId =
      body?.userId ||
      'guest';

    // =================================================
    // VALIDATE URL
    // =================================================

    if (
      !rawUrl ||
      typeof rawUrl !== 'string' ||
      !rawUrl
        .trim()
        .match(/^https?:\/\//i)
    ) {
      return NextResponse.json(
        {
          error:
            'Vui lòng nhập đường link hợp lệ (http:// hoặc https://)',
        },
        {
          status: 400,
        }
      );
    }

    const cleanUrl =
      rawUrl.trim();

    const cleanSubId =
      sanitizeSubId(userId);

    // =================================================
    // EXPAND SHORT URL
    // =================================================

    console.log(
      'Original URL:',
      cleanUrl
    );

    const expandedUrl =
      await expandShortUrl(
        cleanUrl
      );

    console.log(
      'Expanded URL:',
      expandedUrl
    );

    // =================================================
    // DETECT PLATFORM
    // =================================================

    const platform =
      detectPlatform(
        expandedUrl
      );

    console.log(
      'Platform:',
      platform
    );

    // =================================================
    // CREATE AFFILIATE URL
    // =================================================

    let rawAffiliateUrl =
      '';

    // =================================================
    // SHOPEE
    // =================================================

    if (
      platform === 'Shopee'
    ) {
      rawAffiliateUrl =
        createShopeeAffiliateUrl(
          expandedUrl,
          cleanSubId
        );
    }

    // =================================================
    // LAZADA
    // =================================================

    else if (
      platform === 'Lazada'
    ) {
      rawAffiliateUrl =
        createLazadaAffiliateUrl(
          expandedUrl,
          cleanSubId
        );
    }

    // =================================================
    // TIKTOK SHOP
    // =================================================

    else if (
      platform === 'TikTok Shop'
    ) {
      const cleanTikTokUrl =
        cleanTikTokProductUrl(
          expandedUrl
        );

      console.log(
        'Clean TikTok URL:',
        cleanTikTokUrl
      );

      rawAffiliateUrl =
        await createTikTokAffiliateUrl(
          cleanTikTokUrl,
          cleanSubId
        );
    }

    // =================================================
    // WEBSITE KHÁC
    // =================================================

    else {
      rawAffiliateUrl =
        createOtherAffiliateUrl(
          expandedUrl,
          cleanSubId
        );
    }

    // =================================================
    // VALIDATE AFFILIATE URL
    // =================================================

    if (
      !rawAffiliateUrl ||
      !rawAffiliateUrl.startsWith(
        'http'
      )
    ) {
      throw new Error(
        'Affiliate URL không hợp lệ'
      );
    }

    console.log(
      'Raw affiliate URL:',
      rawAffiliateUrl
    );

    // =================================================
    // SHORTEN
    // =================================================

    const affiliateUrl =
      await shortenUrl(
        rawAffiliateUrl
      );

    console.log(
      'Final affiliate URL:',
      affiliateUrl
    );

    // =================================================
    // SAVE SUPABASE
    // =================================================

    await saveLinkHistory(
      String(userId),
      cleanUrl,
      affiliateUrl,
      platform
    );

    // =================================================
    // RESPONSE
    // =================================================

    return NextResponse.json(
      {
        success: true,

        affiliateUrl:

          affiliateUrl,

        platform:

          platform,

        originalUrl:

          cleanUrl,

        expandedUrl:

          expandedUrl,

        productInfo: {
          title:
            `Sản phẩm từ ${platform}`,

          shop:
            `Gian hàng ${platform}`,

          image:
            'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a',
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      '========== CONVERT ERROR =========='
    );

    console.error(
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error';

    return NextResponse.json(
      {
        success: false,

        error:
          'Hệ thống chuyển đổi link tạm thời bận, vui lòng thử lại!',

        detail:
          process.env.NODE_ENV ===
          'development'
            ? message
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}