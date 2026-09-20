import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// Cấu hình thông tin SEO và Open Graph
export const metadata: Metadata = {
  metadataBase: new URL('https://san-sale-cashback-742y.vercel.app'),
  title: 'Săn Sale Hoàn Tiền - Mua Sắm Shopee, Lazada Nhận Hoàn Tiền Thật',
  description: 'Dán link sản phẩm Shopee, Lazada nhận lại tiền hoàn trực tiếp vào tài khoản ngân hàng. Tiết kiệm tối đa khi mua sắm online với tỷ lệ hoàn tiền tới 70%.',
  keywords: [
    'săn sale hoàn tiền',
    'hoàn tiền shopee',
    'cashback shopee',
    'mã giảm giá shopee',
    'hoàn tiền lazada',
    'tiếp thị liên kết hoàn tiền'
  ],
  authors: [{ name: 'Săn Sale Hoàn Tiền' }],
  creator: 'Săn Sale Hoàn Tiền',
  openGraph: {
    title: 'Săn Sale Hoàn Tiền - Mua Sắm Shopee, Lazada Nhận Hoàn Tiền Thật',
    description: 'Dán link sản phẩm bất kỳ, nhận lại tiền mặt hoàn về tài khoản. Rút tiền nhanh chóng, minh bạch!',
    url: 'https://san-sale-cashback-742y.vercel.app',
    siteName: 'Săn Sale Hoàn Tiền',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Săn Sale Hoàn Tiền - Mua sắm hoàn tiền',
      },
    ],
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Săn Sale Hoàn Tiền - Mua Sắm Shopee, Lazada Nhận Hoàn Tiền Thật',
    description: 'Dán link mua sắm Shopee & Lazada nhận hoàn tiền tự động về tài khoản ngân hàng.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>{children}</body>
    </html>
  );
}