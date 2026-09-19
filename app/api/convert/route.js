import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CAMLINK_API_KEY =
  process.env.CAMLINK_API_KEY ||
  'clk_live_32frrc3Ur8Ruon6nwZGOLpeFBvjdodadTwAQGlds8W544JzB';

// Cookie dự phòng nếu Camlink không phản hồi
const DEFAULT_SHOPEE_COOKIE =
  '_hjSessionUser_868286=eyJpZCI6Ijg4OTcyNDU1LTBhZjItNWNiNy1hOTFhLTU2ZjIxYTMxMmNlNSIsImNyZWF0ZWQiOjE3ODg0Mzk1MjA3OTYsImV4aXN0aW5nIjp0cnVlfQ==; SPC_T_ID=ht8v0r4QMabV3eQPkdTnS0TvM7476i9MePfWvQ7gNGib2oQyxgASg07F2kYd3YHQrRz3VoV1t0paWsSpwDxzavW0m+eATv4TYrCg/ivrmMifXQdMjdKaFrYysfPpGI3YB3tiOSLpvd1OI5OYBRGKfpmFjkuFRrgLO8lnmBDp6Ns=; SPC_F=7ZiHw8zjj36pSg5UMwKbEF8cBMvzQO5H; SPC_SC_SESSION=gBsrvReyG/HS0Y5gLI0Cd8PDVOW6zQfutO7dYR6WYVwS859Ey8O0NYatFDm+OImcAj2/Cc74JjDOgo+Fk/56BUpTr3sBxA/QsaxlolUWl1un85Ci90JnKobi6NjhYFO4ER9WOIc5eYvUEQ3J/YBG91xeJ1PZ6CleNl16q5kkU4C96E7qbWDwCXHIJ27nQHzI9D1w3Kc52dNVwLCWpWXiZBm4n7OQf8yLYH0j89Ad/4mgOiX4XEgFsy7oTTjyNFFSNaH5cLlHJYOJuueRk3vkwIg==_1_1194476181; SPC_R_T_ID=ht8v0r4QMabV3eQPkdTnS0TvM7476i9MePfWvQ7gNGib2oQyxgASg07F2kYd3YHQrRz3VoV1t0paWsSpwDxzavW0m+eATv4TYrCg/ivrmMifXQdMjdKaFrYysfPpGI3YB3tiOSLpvd1OI5OYBRGKfpmFjkuFRrgLO8lnmBDp6Ns=; shopee_webUnique_ccd=%2FE%2FnBr%2FA4BOh4wQxll2iFg%3D%3D%7C0FnZPae4lJDa8tebf6UC4JE%2Bx9YaCTtyBbPAZxhku1uLNOsTdlc5cvzPxqOoVG9kpxFd4GBI4Ys%3D%7Cfs9hhFdaig9ducQI%7C08%7C3; _med=refer; REC7iLP4Q=32883d2a-e795-4798-83cc-1f461d936f24; _ga_FV78QC1144=GS2.1.s1789556460$o1$g0$t1789556468$j52$l0$h0; _ga_3XVGTY3603=GS2.1.s1789635271$o1$g1$t1789635810$j60$l0$h0; _sapid=3a17dec70d9d75ad3f4a12c5a5d7b9eea5e3908ca9221872f1e036e6; _fbp=fb.1.1788439521704.563537289926470327; language=vi; _ga=GA1.1.1486090278.1788439520; ds=eb8d65308ef2b8fb891201af8a05a72e; _QPWSDCXHZQA=346a53ac-b1aa-4900-a8d9-d0f9bc50ad76; fblo_421039428061656=y; _fbc=fb.1.1789520914136.IwY2xjawUWy19wZG9mBWV4dG4DYWVtAjEwAGJyaWQRMUtXaVVielJJNzlBZWZ2eG1zcnRjBmFwcF9pZBAyMjIwMzkxNzg4MjAwODkyAAEewjRGCjX8pUIznwDYj-ljqU4sCjwSMrz9IruJRwUptIAqqp1c5_a10oLgTdk_aem_mYPJmlAwTGvaQMRVwXktmA; _ga_4GPP1ZXG63=GS2.1.s1789788478$o16$g1$t1789790125$j58$l0$h2046033167; _gcl_au=1.1.1472061593.1786328548; CTOKEN=w%2BShqrFjEfGsTA5lm99%2FpA%3D%3D; REC_T_ID=5300615d-a795-11f1-b204-6a903eadfda7; SC_DFP=bUYBWUQGzSKiabKxlAIBOzlSUbJHJIyo; SPC_CLIENTID=N1ppSHc4empqMzZwjfqarpfgrfidpxpp; SPC_R_T_IV=Z2xnSm5QbUUySEY4UFpkWQ==; SPC_SC_MAIN_SHOP_SA_UD=0; SPC_ST=O74BAkNWZi+ckPkRvPOP/SI08FCGdVzTLZDAl4nEf3IBjR1gke17phmaVj5pBmAUecJY10jqM0hq1wxYb5H55BQ8A3f8H0xJ+oq6hKe+geyOTVnVvjCSsEDN54F9haCgfwKSVxMOXUL8KmGjEDHABeQg2sc8pWsVw8qTH4uQJMsKrQDirqtqSKpesbtEzoNHkxCLE3k9Rt8pHMpKqbRFEA==.AHtkcm7BW0WluDxvKqOYRV65WSJZrPkH32d0RUEh0tbS; SPC_STK=iiGQOAX7T/pIfixQbam0FAyeIWR+6/8pgxtMZGqWHH/unYYt8B5VAtP1ASoLrqZjUGyH/b+cOT7GlIej66T0VNDE3CO0FiU13zLYWRW5ysObo5XfaoZsBAVgOnFlv81toKI6PiyOs1hmCgu5hQiX3a6FaJsfeI74fzxZBld1slWW5c2mY43jtvF3xtFV3EyprMwZmktVA+OtckkvHKYwZtr5/dfohpi3Yln91dQgLxROSvB9P+7aNKGMVlCDfXtfu43Yk2CVYrD57VgQXxkvJTF1mct/GrDtHkMvsXGNJzTcRHl5KqqCwn0XFwDnzy4GXAI7joZ2jH7TTroyypYL5Qd9OPpw0diEUAeMT4v9JKSwmA2GPk8RoaNifgCiEL6zr5kQGjGNdGmBoKcdU0o6mL1BEE/00eDr+ikk7linPbTU6eTwCrJ1EPFK2E9nP0sxBr3FXBMF1C/E/hCQ4QW+rP/5ibZLGOi2gP85hB7PluforzxC/0PIBkrrJps1h4F9; SPC_T_IV=Z2xnSm5QbUUySEY4UFpkWQ==; SPC_U=1194476181';

// Mở URL rút gọn nếu cần
async function resolveFinalUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    return res.url || url;
  } catch {
    return url;
  }
}

export async function POST(req) {
  try {
    const { originalUrl, userId } = await req.json();

    if (!originalUrl || !originalUrl.startsWith('http')) {
      return NextResponse.json(
        { error: 'Vui lòng nhập link hợp lệ (bắt đầu bằng http hoặc https)' },
        { status: 400 }
      );
    }

    const subId = userId ? String(userId).slice(0, 50) : 'guest';

    // Nhận diện sàn
    let platform = 'Khác';
    if (
      originalUrl.includes('shopee.vn') ||
      originalUrl.includes('shp.ee') ||
      originalUrl.includes('s.shopee.vn')
    ) {
      platform = 'Shopee';
    } else if (originalUrl.includes('lazada.vn')) {
      platform = 'Lazada';
    } else if (originalUrl.includes('tiktok.com')) {
      platform = 'TikTok';
    }

    let affiliateUrl = '';

    // ==========================================
    // TRƯỜNG HỢP 1: SHOPEE -> GỌI QUA CAMLINK API
    // ==========================================
    if (platform === 'Shopee') {
      try {
        const camlinkRes = await fetch(
          'https://apicam.hoantienz.com/api/v1/affiliate/convert-link',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${CAMLINK_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              original_links: [originalUrl.trim()],
              sub_id_1: subId,
            }),
          }
        );

        const camlinkData = await camlinkRes.json();

        if (camlinkRes.ok && camlinkData.success) {
          const links = camlinkData?.data?.data?.batchCustomLink;
          if (links && links.length > 0) {
            affiliateUrl = links[0].shortLink || links[0].longLink;
          }
        } else {
          console.warn('Camlink API báo lỗi, chuyển sang fallback cookie:', camlinkData);
        }
      } catch (camlinkErr) {
        console.warn('Lỗi kết nối Camlink, chuyển sang fallback:', camlinkErr);
      }

      // Fallback: Nếu Camlink chưa cấu hình xong cookie thì chạy GraphQL Shopee
      if (!affiliateUrl) {
        let finalUrl = originalUrl;
        if (originalUrl.includes('s.shopee.vn') || originalUrl.includes('shp.ee')) {
          finalUrl = await resolveFinalUrl(originalUrl);
        }

        const cookie = process.env.SHOPEE_COOKIE || DEFAULT_SHOPEE_COOKIE;
        const shopeeRes = await fetch('https://affiliate.shopee.vn/api/v3/gql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookie,
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://affiliate.shopee.vn/offer/custom_link',
            Origin: 'https://affiliate.shopee.vn',
          },
          body: JSON.stringify({
            operationName: 'batchCustomLink',
            query: `
              query batchCustomLink($linkParams: [CustomLinkParam!]!) {
                batchCustomLink(linkParams: $linkParams) {
                  shortLink
                  longLink
                  failCode
                }
              }
            `,
            variables: {
              linkParams: [
                {
                  originalLink: finalUrl,
                  subIds: [subId],
                },
              ],
            },
          }),
        });

        const resJson = await shopeeRes.json();
        const linkData = resJson?.data?.batchCustomLink?.[0];
        affiliateUrl = linkData?.shortLink || linkData?.longLink;
      }

      if (!affiliateUrl) {
        return NextResponse.json(
          {
            error:
              'Không thể tạo link hoàn tiền Shopee. Vui lòng kiểm tra lại kết nối Shopee Affiliate trên Camlink hoặc làm mới Cookie.',
          },
          { status: 500 }
        );
      }
    }

    // ==========================================
    // TRƯỜNG HỢP 2: LAZADA / TIKTOK -> QUA MASOFFER
    // ==========================================
    else {
      let finalUrl = originalUrl;
      if (originalUrl.includes('vt.tiktok.com')) {
        finalUrl = await resolveFinalUrl(originalUrl);
      }
      const cleanUrl = finalUrl.split('?')[0];
      const encodedUrl = encodeURIComponent(cleanUrl);
      const MO_PARTNER_CODE =
        process.env.NEXT_PUBLIC_MASOFFER_ID || 'dien_ma_masoffer_vao_day';

      affiliateUrl = `https://go.masoffer.net/v0/${MO_PARTNER_CODE}/?go=${encodedUrl}&traffic_id=${userId || 'guest'}`;
    }

    // ==========================================
    // LƯU LỊCH SỬ VÀO SUPABASE
    // ==========================================
    if (userId && userId !== 'guest') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from('link_history').insert({
          user_id: userId,
          original_url: originalUrl,
          affiliate_url: affiliateUrl,
          platform: platform,
        });
      }
    }

    return NextResponse.json({ affiliateUrl, platform });
  } catch (error) {
    console.error('Lỗi API convert:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi xử lý link' },
      { status: 500 }
    );
  }
}