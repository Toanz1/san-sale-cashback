'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ExternalLink, Copy, Check, Sparkles, Tag, Flame, Wallet, UserCheck } from 'lucide-react';

export default function Home() {
  const [inputUrl, setInputUrl] = useState('');
  const [convertedUrl, setConvertedUrl] = useState('');
  const [user, setUser] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Kiểm tra đăng nhập
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));

    // Lấy danh sách voucher và deal từ Supabase
    supabase.from('coupons').select('*').then(({ data }) => setCoupons(data || []));
    supabase.from('trending_products').select('*').then(({ data }) => setProducts(data || []));
  }, []);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl) return;
    setLoading(true);

    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawUrl: inputUrl, userId: user?.id || null })
      });
      const data = await res.json();
      if (data.affiliateUrl) {
        setConvertedUrl(data.affiliateUrl);
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyText = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Thanh Menu Trên Cùng */}
      <header className="bg-orange-600 text-white shadow sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="font-extrabold text-xl tracking-tight flex items-center gap-1.5">
            <Sparkles className="text-yellow-300" /> SĂN SALE HOÀN TIỀN
          </a>
          <div>
            {user ? (
              <a href="/profile" className="flex items-center gap-1.5 bg-white text-orange-600 font-bold px-4 py-2 rounded-lg text-sm shadow hover:bg-orange-50">
                <Wallet size={16} /> Ví Của Tôi
              </a>
            ) : (
              <a href="/auth" className="flex items-center gap-1.5 bg-white text-orange-600 font-bold px-4 py-2 rounded-lg text-sm shadow hover:bg-orange-50">
                <UserCheck size={16} /> Đăng nhập / Đăng ký
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Khu Vực Dán Link Hoàn Tiền */}
      <section className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white py-12 px-4 shadow-inner">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-black mb-3">Dán Link Shopee / Lazada Để Nhận Hoàn Tiền</h1>
          <p className="text-orange-100 text-sm sm:text-base mb-6">
            Rút tiền trực tiếp về tài khoản ngân hàng khi hoàn tất đơn hàng
          </p>

          <form onSubmit={handleConvert} className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
            <input
              type="url"
              placeholder="Dán link sản phẩm (Shopee, Lazada)..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
              className="flex-1 px-4 py-3.5 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm shadow"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold px-6 py-3.5 rounded-xl text-sm shadow flex items-center justify-center gap-2 shrink-0 transition"
            >
              {loading ? 'Đang tạo link...' : 'Lấy Link Hoàn Tiền'}
            </button>
          </form>

          {/* Kết quả trả về sau khi dán link */}
          {convertedUrl && (
            <div className="mt-6 p-4 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-left max-w-2xl mx-auto">
              <div className="overflow-hidden w-full">
                <p className="text-xs text-orange-200">Link đã gắn mã hoàn tiền:</p>
                <p className="text-sm font-mono truncate text-white">{convertedUrl}</p>
              </div>
              <a
                href={convertedUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-white text-orange-600 font-bold px-5 py-2 rounded-lg text-sm flex items-center gap-1.5 shrink-0 hover:bg-orange-50 shadow"
              >
                Mua ngay <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Nội Dung Chính */}
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-12">
        {/* Kho Mã Giảm Giá */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Tag className="text-orange-600" />
            <h2 className="text-xl font-bold">Mã Giảm Giá Đang Hoạt Động</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {coupons.map((c) => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition">
                <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded mb-2">
                  {c.platform}
                </span>
                <h3 className="font-bold text-slate-800 text-sm">{c.title}</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">{c.description}</p>
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="font-mono text-xs font-bold bg-slate-100 text-orange-600 px-2.5 py-1 rounded">
                    {c.code}
                  </span>
                  <button
                    onClick={() => copyText(c.code)}
                    className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded transition"
                  >
                    {copiedCode === c.code ? <Check size={12} /> : <Copy size={12} />}
                    {copiedCode === c.code ? 'Đã chép' : 'Sao chép'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sản Phẩm Bán Chạy Hoàn Tiền */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="text-red-500" />
            <h2 className="text-xl font-bold">Sản Phẩm Hot Hoàn Tiền Cao</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow transition">
                <img src={p.image_url} alt={p.title} className="w-full h-44 object-cover" />
                <div className="p-3.5">
                  <h3 className="text-xs font-medium text-slate-800 line-clamp-2 mb-2">{p.title}</h3>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-orange-600 font-bold text-sm">
                      {Number(p.sale_price).toLocaleString('vi-VN')} đ
                    </span>
                    <span className="bg-green-100 text-green-700 text-[11px] font-bold px-1.5 py-0.5 rounded">
                      Hoàn ~{p.cashback_rate}%
                    </span>
                  </div>
                  <a
                    href={p.product_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center w-full py-2 bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white rounded-lg text-xs font-bold transition"
                  >
                    Mua Ngay
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}