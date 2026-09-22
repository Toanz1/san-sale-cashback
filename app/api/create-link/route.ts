```ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const TIKTOK_CAMPAIGN_ID =
  process.env.TIKTOK_CAMPAIGN_ID || '6648523843406889655';

const SHOPEE_AFFILIATE_ID =
  process.env.SHOPEE_AFFILIATE_ID || '';

const LAZADA_AFFILIATE_ID =
  process.env.LAZADA_AFFILIATE_ID || '';

const ACCESSTRADE_API_KEY =
  process.env.ACCESSTRADE_API_KEY || '';


// =====================================================
// EXPAND SHORT URL
// =====================================================

async function expandShortUrl(
  url: string
): Promise<string> {
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

        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },

      cache: 'no-store',
    });

    if (
      response.url &&
      !response.url.includes('404') &&
      !response.url.includes('error')
    ) {
      return response.url;
    }
  } catch (error) {
    console.error(
      'Lỗi giải mã link:',
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
// CLEAN SUB ID
// =====================================================

function cleanSubId(
  value: unknown
): string {
  return String(value || 'guest')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50) || 'guest';
}


// =====================================================
// CLEAN TIKTOK URL
// =====================================================

function cleanTikTokUrl(
  url: string
): string {
  /*
   * Ví dụ:
   *
   * https://shop.tiktok.com/vn/pdp/123456789?xxx=yyy
   *
   * =>
   *
   * https://shop.tiktok.com/vn/pdp/123456789
   */

  const match = url.match(
    /\/pdp\/(\d+)/
  );

  if (match?.[1]) {
    return `https://shop.tiktok.com/vn/pdp/${match[1]}`;
  }

  return url.split('?')[0];
}


// =====================================================
// SHORTEN URL
// =====================================================

async function shortenUrl(
  longUrl: string
): Promise<string> {
  try {
    const apiUrl =
      `https://is.gd/create.php` +
      `?format=simple` +
      `&url=${encodeURIComponent(longUrl)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(
        'is.gd HTTP:',
        response.status
      );

      return longUrl;
    }

    const text =
      (await response.text()).trim();

    if (text.startsWith('http')) {
      return text;
    }
  } catch (error) {
    console.error(
      'Lỗi is.gd:',
      error
    );
  }

  return longUrl;
}


// =====================================================
// SHOPEE
// =====================================================

function createShopeeLink(
  url: string,
  subId: string
): string {
  const baseUrl =
    url.split('?')[0];

  /*
   * Nếu bạn đã có Affiliate ID Shopee
   * thì sử dụng link tracking chuẩn.
   */

  if (SHOPEE_AFFILIATE_ID) {
    return (
      `https://s.shopee.vn/an_redir` +
      `?origin_link=${encodeURIComponent(baseUrl)}` +
      `&affiliate_id=${encodeURIComponent(SHOPEE_AFFILIATE_ID)}` +
      `&sub_id=${encodeURIComponent(subId)}`
    );
  }

  /*
   * Fallback nếu chưa cấu hình Affiliate ID.
   */

  return (
    `https://s.shopee.vn/universal-link` +
    `?url=${encodeURIComponent(baseUrl)}` +
    `&sub_id=${encodeURIComponent(subId)}`
  );
}


// =====================================================
// LAZADA
// =====================================================

function createLazadaLink(
  url: string,
  subId: string
): string {
  const baseUrl =
    url.split('?')[0];

  if (!LAZADA_AFFILIATE_ID) {
    throw new Error(
      'Chưa cấu hình LAZADA_AFFILIATE_ID'
    );
  }

  return (
    `https://s.lazada.vn/s.${LAZADA_AFFILIATE_ID}` +
    `?sub_id=${encodeURIComponent(subId)}` +
    `&url=${encodeURIComponent(baseUrl)}`
  );
}


// =====================================================
// ACCESSTRADE - TIKTOK SHOP
// =====================================================

async function createTikTokAffiliateLink(
  productUrl: string,
  subId: string
): Promise<string> {
  if (!ACCESSTRADE_API_KEY) {
    throw new Error(
      'Thiếu ACCESSTRADE_API_KEY trong Environment Variables'
    );
  }

  console.log(
    '========== TIKTOK ACCESSTRADE =========='
  );

  console.log(
    'Campaign:',
    TIKTOK_CAMPAIGN_ID
  );

  console.log(
    'Product URL:',
    productUrl
  );

  console.log(
    'Sub ID:',
    subId
  );

  const response = await fetch(
    'https://api.accesstrade.vn/v1/product_link/create',
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',

        Authorization:
          `token ${ACCESSTRADE_API_KEY}`,
      },

      body: JSON.stringify({
        campaign_id:
          TIKTOK_CAMPAIGN_ID,

        urls: [
          productUrl
        ],

        utm_source:
          subId
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
    data =
      JSON.parse(responseText);
  } catch {
    throw new Error(
      `AccessTrade trả về JSON không hợp lệ: ${responseText}`
    );
  }

  let affiliateUrl = '';

  // -----------------------------------------------
  // data là ARRAY
  // -----------------------------------------------

  if (
    Array.isArray(data?.data) &&
    data.data.length > 0
  ) {
    const item =
      data.data[0];

    affiliateUrl =
      item.short_url ||
      item.aff_short_url ||
      item.url ||
      item.aff_url ||
      '';
  }

  // -----------------------------------------------
  // data là OBJECT
  // -----------------------------------------------

  else if (
    data?.data &&
    typeof data.data === 'object'
  ) {
    affiliateUrl =
      data.data.short_url ||
      data.data.aff_short_url ||
      data.data.url ||
      data.data.aff_url ||
      '';
  }

  // -----------------------------------------------
  // URL nằm ở root
  // -----------------------------------------------

  if (!affiliateUrl) {
    affiliateUrl =
      data?.short_url ||
      data?.aff_short_url ||
      data?.url ||
      data?.aff_url ||
      '';
  }

  if (
    !affiliateUrl ||
    !affiliateUrl.startsWith('http')
  ) {
    throw new Error(
      `AccessTrade không trả về affiliate URL. Response: ${responseText}`
    );
  }

  console.log(
    'AccessTrade affiliate URL:',
    affiliateUrl
  );

  return affiliateUrl;
}


// =====================================================
// POST
// =====================================================

export async function POST(
  req: Request
) {
  try {
    // ================================================
    // BODY
    // ================================================

    const body =
      await req.json();

    const originalUrl =
      body?.originalUrl ||
      body?.url ||
      '';

    const userId =
      body?.userId ||
      'guest';

    const userCode =
      body?.userCode ||
      '';

    // ================================================
    // VALIDATE
    // ================================================

    if (
      !originalUrl ||
      typeof originalUrl !== 'string'
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Vui lòng cung cấp link sản phẩm'
        },
        {
          status: 400
        }
      );
    }

    const inputUrl =
      originalUrl.trim();

    if (
      !/^https?:\/\//i.test(
        inputUrl
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Link phải bắt đầu bằng http:// hoặc https://'
        },
        {
          status: 400
        }
      );
    }

    // ================================================
    // SUB ID
    // ================================================

    const subId =
      cleanSubId(
        userCode ||
        userId ||
        'guest'
      );

    // ================================================
    // EXPAND
    // ================================================

    console.log(
      'Original URL:',
      inputUrl
    );

    const expandedUrl =
      await expandShortUrl(
        inputUrl
      );

    console.log(
      'Expanded URL:',
      expandedUrl
    );

    // ================================================
    // DETECT PLATFORM
    // ================================================

    let platform =
      'Website khác';

    let affiliateUrl =
      '';

    // ================================================
    // SHOPEE
    // ================================================

    if (
      expandedUrl.includes(
        'shopee.vn'
      ) ||
      expandedUrl.includes(
        'shopee.co'
      ) ||
      expandedUrl.includes(
        'shp.ee'
      ) ||
      expandedUrl.includes(
        'shope.ee'
      ) ||
      expandedUrl.includes(
        's.shopee.vn'
      )
    ) {
      platform =
        'Shopee';

      affiliateUrl =
        createShopeeLink(
          expandedUrl,
          subId
        );
    }

    // ================================================
    // LAZADA
    // ================================================

    else if (
      expandedUrl.includes(
        'lazada.vn'
      ) ||
      expandedUrl.includes(
        's.lazada.vn'
      ) ||
      expandedUrl.includes(
        'lazada.com'
      )
    ) {
      platform =
        'Lazada';

      affiliateUrl =
        createLazadaLink(
          expandedUrl,
          subId
        );
    }

    // ================================================
    // TIKTOK SHOP
    // ================================================

    else if (
      expandedUrl.includes(
        'tiktok.com'
      ) ||
      expandedUrl.includes(
        'shop.tiktok'
      ) ||
      expandedUrl.includes(
        'vt.tiktok.com'
      )
    ) {
      platform =
        'TikTok Shop';

      // ---------------------------------------------
      // Chuẩn hóa URL sản phẩm
      // ---------------------------------------------

      const productUrl =
        cleanTikTokUrl(
          expandedUrl
        );

      console.log(
        'TikTok product URL:',
        productUrl
      );

      // ---------------------------------------------
      // Gọi AccessTrade
      // ---------------------------------------------

      affiliateUrl =
        await createTikTokAffiliateLink(
          productUrl,
          subId
        );

      /*
       * QUAN TRỌNG:
       *
       * Không fallback sang isclix.
       *
       * Nếu AccessTrade lỗi,
       * hàm sẽ throw error.
       *
       * Nhờ vậy bạn biết chính xác
       * AccessTrade đang lỗi ở đâu.
       */
    }

    // ================================================
    // WEBSITE KHÁC
    // ================================================

    else {
      platform =
        'Website khác';

      affiliateUrl =
        `https://go.isclix.com/deep_link` +
        `?url=${encodeURIComponent(expandedUrl)}` +
        `&utm_source=Publisher%20Coupon` +
        `&sub_id=${encodeURIComponent(subId)}`;
    }

    // ================================================
    // SHORTEN
    // ================================================

    const finalAffiliateUrl =
      await shortenUrl(
        affiliateUrl
      );

    console.log(
      'Final affiliate URL:',
      finalAffiliateUrl
    );

    // ================================================
    // SAVE SUPABASE
    // ================================================

    if (
      userId &&
      userId !== 'guest'
    ) {
      const {
        error: supabaseError
      } = await supabase
        .from('link_history')
        .insert([
          {
            user_id:
              userId,

            original_url:
              inputUrl,

            affiliate_url:
              finalAffiliateUrl,

            platform:
              platform,

            status:
              'pending',

            cashback_amount:
              0
          }
        ]);

      if (supabaseError) {
        console.error(
          'Supabase error:',
          supabaseError
        );
      }
    }

    // ================================================
    // RESPONSE
    // ================================================

    return NextResponse.json(
      {
        success:
          true,

        platform:
          platform,

        affiliateUrl:
          finalAffiliateUrl,

        originalUrl:
          inputUrl,

        expandedUrl:
          expandedUrl
      },
      {
        status: 200
      }
    );

  } catch (error) {
    console.error(
      '========== CREATE LINK ERROR =========='
    );

    console.error(
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : 'Lỗi không xác định';

    return NextResponse.json(
      {
        success:
          false,

        error:
          message
      },
      {
        status: 500
      }
    );
  }
}

