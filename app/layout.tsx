import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

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
      <body className="bg-[#0d0f17] text-white antialiased min-h-screen flex flex-col">
        {/* Header điều hướng chung */}
        <header className="border-b border-gray-800 bg-[#121624]/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="font-extrabold text-lg text-red-500 flex items-center gap-2">
              🔥 <span>Săn Sale Cashback</span>
            </Link>

            <nav className="flex items-center gap-4 text-sm">
              <Link href="/history" className="text-gray-300 hover:text-white transition">
                Lịch sử
              </Link>
              <Link href="/wallet" className="text-gray-300 hover:text-white transition">
                Ví tiền
              </Link>
              <Link
                href="/admin/orders"
                className="text-xs bg-gray-800 hover:bg-gray-700 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20 transition"
              >
                Duyệt Shopee
              </Link>
              <Link
                href="/login"
                className="bg-red-600 hover:bg-red-500 text-white text-xs px-3.5 py-1.5 rounded-lg font-medium transition"
              >
                Tài khoản
              </Link>
            </nav>
          </div>
        </header>

        {/* Nội dung trang */}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}