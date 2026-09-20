import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Săn Sale Hoàn Tiền - Mua sắm Shopee nhận Cashback",
  description: "Dán link sản phẩm Shopee nhận hoàn tiền mặt tự động về tài khoản ngân hàng.",
  openGraph: {
    title: "Săn Sale Hoàn Tiền - Tiết kiệm tối đa khi mua sắm",
    description: "Nhận hoàn tiền hoa hồng lên đến 70% khi mua sắm qua link Shopee.",
    url: "https://san-sale-cashback-742y.vercel.app",
    siteName: "Săn Sale Hoàn Tiền",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Săn Sale Cashback Banner",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="bg-[#0b0f19] text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}