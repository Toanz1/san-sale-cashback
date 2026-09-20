'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [hotProducts, setHotProducts] = useState<any[]>([]);

  // State quản lý Modal Hướng dẫn tự động bật
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const ADMIN_EMAIL = 'toanzin00001@gmail.com';

  const defaultVouchers = [
    { id: '1', platform: 'Shopee', code: 'SHOPEE50K', title: 'Giảm 50K cho đơn từ 250K', category: 'Toàn sàn', expire_time: 'Hôm nay', affiliate_link: '' },
    { id: '2', platform: 'Shopee', code: 'FREESHIPXTRA', title: 'Miễn phí vận chuyển tới 70K', category: 'Freeship', expire_time: '23:59', affiliate_link: '' },
    { id: '3', platform: 'Lazada', code: 'LAZ30K', title: 'Giảm 30K đơn từ 150K', category: 'Thu thập', expire_time: 'Sắp hết', affiliate_link: '' },
    { id: '4', platform: 'TikTok', code: 'TTSHOP20', title: 'Giảm 15% cho đơn đầu tiên', category: 'Khách mới', expire_time: 'Còn 2 ngày', affiliate_link: '' },
  ];

  const loadUserProfile = async (currentUser: any) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
      if (data) {
        if (currentUser.email === ADMIN_EMAIL && data.role !== 'admin') {
          data.role = 'admin';
          await supabase.from('profiles').update({ role: 'admin' }).eq('id', currentUser.id);
        }
        setProfile(data);
      } else {
        const fallbackProfile = {
          id: currentUser.id,
          email: currentUser.email,
          balance: 0,
          role: currentUser.email === ADMIN_EMAIL ? 'admin' : 'user'
        };
        setProfile(fallbackProfile);
        await supabase.from('profiles').upsert(fallbackProfile);
      }
    } catch (err) {
      console.error('Lỗi profile:', err);
    }
  };

  const fetchData = async () => {
    try {
      const { data: vouData } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });
      setVouchers(vouData && vouData.length > 0 ? vouData : defaultVouchers);

      const { data: prodData } = await supabase.from('hot_products').select('*').order('created_at', { ascending: false });
      setHotProducts(prodData || []);
    } catch {
      setVouchers(defaultVouchers);
    }
  };

  useEffect(() => {
    // Kiểm tra và tự động mở modal nếu chưa chọn ẩn
    const hasSeenGuide = localStorage.getItem('has_seen_cashback_guide');
    if (!hasSeenGuide) {
      setShowGuideModal(true);
    }

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) await loadUserProfile(currentUser);
    };

    initAuth();
    fetchData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) await loadUserProfile(currentUser);
      else setProfile(null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleCloseGuide = () => {
    if (dontShowAgain) {
      localStorage.setItem('has_seen_cashback_guide', 'true');
    }
    setShowGuideModal(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputUrl(text);
    } catch {
      alert('Không thể đọc bộ nhớ tạm. Hãy dùng phím tắt (Ctrl + V).');
    }
  };

  const handleConvert = async () => {
    if (!inputUrl) return alert('Vui lòng dán link sản phẩm!');
    setLoading(true);
    setAffiliateLink('');

    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalUrl: inputUrl, userId: user ? user.id : 'guest' })
      });
      const data = await res.json();
      if (data.affiliateUrl) setAffiliateLink(data.affiliateUrl);
      else alert(data.error || 'Không thể tạo link hoàn tiền!');
    } catch {
      alert('Đã xảy ra lỗi khi tạo link!');
    }
    setLoading(false);
  };

  const handleCopyCode = (voucher: any) => {
    navigator.clipboard.writeText(voucher.code);
    setCopiedVoucher(voucher.code);
    setTimeout(() => setCopiedVoucher(null), 2000);

    const link = voucher.affiliate_link || voucher.affiliate_url;
    if (link) window.open(link, '_blank');
  };

  const isUserAdmin = profile?.role === 'admin' || user?.email === ADMIN_EMAIL;
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Thành viên';
  const avatarChar = (displayName[0] || 'U').toUpperCase();

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0F172A]/80 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center font-black text-xl shadow-lg shadow-rose-500/20 text-white">
              S
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                SĂN SALE <span className="text-rose-500 font-black">HOÀN TIỀN</span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Cashback Sàn TMĐT</p>
            </div>
          </Link>

          <div>
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 px-2.5 py-1.5 rounded-lg transition"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {avatarChar}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 max-w-[120px] truncate">{displayName}</span>
                </Link>

                {isUserAdmin && (
                  <Link
                    href="/admin"
                    className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-md transition flex items-center gap-1.5"
                  >
                    <span>⚙</span> Quản trị
                  </Link>
                )}

                <Link
                  href="/profile"
                  className="text-xs bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
                >
                  <span className="text-slate-400 hidden sm:inline">Số dư:</span>
                  <span className="text-emerald-400 font-bold">{Number(profile?.balance || 0).toLocaleString()}đ</span>
                </Link>

                <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-rose-400 transition px-2 py-1">
                  Thoát
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 px-4 sm:px-5 py-2 rounded-xl transition shadow-lg text-white"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section & Form chuyển link */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase tracking-wide mb-6">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            Hoàn tiền tự động tới 70% hoa hồng
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4">
            Dán Link Sản Phẩm. <br />
            <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              Nhận Lại Tiền Khi Mua Sắm.
            </span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Áp dụng cho mọi sản phẩm trên Shopee, Lazada & TikTok Shop. Rút tiền về ngân hàng nhanh chóng.
          </p>

          <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 p-3 sm:p-4 rounded-2xl shadow-2xl text-left">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full flex items-center">
                <input
                  type="text"
                  placeholder="Dán link sản phẩm Shopee, Lazada vào đây..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 text-sm text-white placeholder-slate-500 rounded-xl pl-4 pr-20 py-3.5 outline-none focus:border-rose-500 transition"
                />
                <button
                  onClick={handlePasteClipboard}
                  type="button"
                  className="absolute right-2 px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-lg transition"
                >
                  Dán nhanh
                </button>
              </div>

              <button
                onClick={handleConvert}
                disabled={loading}
                type="button"
                className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg transition"
              >
                {loading ? 'Đang xử lý...' : 'Lấy Link Hoàn Tiền'}
              </button>
            </div>

            {affiliateLink && (
              <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-wide">✓ Đã gắn mã hoàn tiền thành công!</p>
                  <p className="text-xs text-slate-300 mt-0.5">Bấm vào nút để chuyển sang sàn và ghi nhận hoàn tiền.</p>
                </div>
                <a
                  href={affiliateLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto text-center bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase px-5 py-2.5 rounded-lg shadow transition shrink-0"
                >
                  Đi Tới Mua Hàng ➔
                </a>
              </div>
            )}

            {/* Nút bấm mở lại Hướng Dẫn */}
            <div className="mt-3.5 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-400">💡 Mua sắm lần đầu?</span>
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="text-amber-400 hover:text-amber-300 font-bold hover:underline flex items-center gap-1 transition"
              >
                <span>📖 Xem hướng dẫn nhận hoàn tiền 100% (Tránh mất đơn)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MỤC SẢN PHẨM BÁN CHẠY (HOT DEALS) */}
      {hotProducts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                🔥 Sản Phẩm Bán Chạy Hoàn Tiền Khủng
              </h2>
              <p className="text-xs text-slate-400 mt-1">Bấm mua ngay để nhận hoa hồng hoàn tiền trực tiếp</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {hotProducts.map((p) => {
              const numRate = parseFloat(p.cashback_rate) || 5;
              const estimatedCashback = Math.round((Number(p.price) * numRate) / 100);

              return (
                <a
                  key={p.id}
                  href={p.affiliate_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-slate-800/60 border border-slate-700/60 hover:border-rose-500/60 rounded-xl overflow-hidden flex flex-col justify-between transition hover:-translate-y-1 shadow-lg"
                >
                  <div>
                    <div className="relative aspect-square w-full bg-slate-900 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute top-2 left-2 bg-gradient-to-r from-rose-600 to-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                        {p.cashback_rate ? (p.cashback_rate.includes('%') ? p.cashback_rate : `${p.cashback_rate}%`) : '5%'}
                      </div>
                      <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-[10px] text-slate-300 font-bold px-1.5 py-0.5 rounded">
                        {p.platform || 'Shopee'}
                      </div>
                    </div>

                    <div className="p-3">
                      <p className="text-xs font-semibold text-white line-clamp-2 leading-snug group-hover:text-rose-400 transition">
                        {p.title}
                      </p>
                      
                      {/* Giá bán và giá gốc */}
                      <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-sm font-black text-rose-400">
                          {Number(p.price).toLocaleString()}đ
                        </span>
                        {Number(p.original_price) > Number(p.price) && (
                          <span className="text-[10px] text-slate-500 line-through">
                            {Number(p.original_price).toLocaleString()}đ
                          </span>
                        )}
                      </div>

                      {/* KHỐI HIỂN THỊ TIỀN HOÀN DỰ KIẾN RÕ RÀNG */}
                      <div className="mt-2 py-1.5 px-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                        <span className="text-[10px] text-slate-300 font-medium">Hoàn tiền:</span>
                        <span className="text-[11px] font-black text-emerald-400">
                          +{estimatedCashback.toLocaleString()}đ
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 pt-0">
                    <div className="w-full text-center bg-slate-700/70 group-hover:bg-rose-600 text-slate-200 group-hover:text-white font-bold text-[11px] py-1.5 rounded-lg transition">
                      Mua Hoàn Tiền ➔
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Danh mục Voucher */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              🎟️ Mã Giảm Giá & Voucher Độc Quyền
            </h2>
            <p className="text-xs text-slate-400 mt-1">Sao chép mã trước khi bấm lấy link mua sắm</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {vouchers.map((v) => {
            const hasLink = Boolean(v.affiliate_link || v.affiliate_url);
            return (
              <div
                key={v.id}
                className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-200">
                      {v.platform}
                    </span>
                    <span className="text-[10px] text-amber-400 font-semibold">{v.category || v.tag || 'Ưu đãi'}</span>
                  </div>
                  <p className="text-sm font-semibold text-white line-clamp-2">{v.title || v.description}</p>
                  <p className="text-[11px] text-slate-400 mt-2">Hết hạn: {v.expire_time || v.expires || 'Hôm nay'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-rose-400 tracking-wider bg-rose-500/10 px-2 py-1 rounded">
                    {v.code}
                  </span>
                  <button
                    onClick={() => handleCopyCode(v)}
                    type="button"
                    className="text-xs font-semibold text-slate-200 hover:text-white bg-rose-600 hover:bg-rose-500 px-3 py-1.5 rounded-lg transition shadow-sm flex items-center gap-1.5"
                  >
                    <span>{copiedVoucher === v.code ? '✓ Đã chép' : 'Sao chép & Dùng'}</span>
                    {hasLink && <span className="text-[10px]">➔</span>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= MODAL HƯỚNG DẪN MUA SẮM (TỰ ĐỘNG BẬT KHI VÀO TRANG) ================= */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                📖 Quy Trình Hoàn Tiền 100% Thành Công
              </h3>
              <button
                type="button"
                onClick={handleCloseGuide}
                className="text-slate-400 hover:text-white text-xl font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="flex gap-3.5 items-start bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-2xl">
                <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-black flex items-center justify-center shrink-0 text-xs shadow-md shadow-rose-500/30">
                  1
                </span>
                <div>
                  <h4 className="font-bold text-white mb-0.5">Tìm sản phẩm & Sao chép link</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Vào ứng dụng Shopee, Lazada & TikTok Shop chọn món đồ cần mua rồi bấm <strong>Chia sẻ ➔ Sao chép liên kết</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-2xl">
                <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-black flex items-center justify-center shrink-0 text-xs shadow-md shadow-rose-500/30">
                  2
                </span>
                <div>
                  <h4 className="font-bold text-white mb-0.5">Dán link vào trang & Nhận link hoàn tiền</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Dán link vào ô nhập, bấm <strong>Lấy Link Hoàn Tiền</strong>, sau đó bấm <strong>Đi Tới Mua Hàng</strong> để hệ thống ghi nhận tài khoản của bạn.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-2xl">
                <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-black flex items-center justify-center shrink-0 text-xs shadow-md shadow-rose-500/30">
                  3
                </span>
                <div>
                  <h4 className="font-bold text-white mb-0.5">Thanh toán đơn hàng ngay</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Hoàn tất đặt hàng. Tiền hoàn sẽ được ghi nhận vào mục <strong>Tài khoản ➔ Đơn hàng</strong> sau 1-2 tiếng.
                  </p>
                </div>
              </div>

              {/* Hộp lưu ý chống mất hoa hồng */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  ⚠️ Lưu ý quan trọng để không bị mất đơn:
                </p>
                <ul className="list-disc list-inside text-amber-200/80 space-y-1 text-[11px] leading-relaxed">
                  <li>Không bấm qua link của người khác hoặc group săn sale sau khi đã lấy link.</li>
                  <li>Phải đặt hàng và thanh toán trên cùng thiết bị vừa bấm link.</li>
                  <li>Không thoát hoặc đổi tài khoản sàn khi đang thanh toán.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-rose-600 focus:ring-rose-500 accent-rose-500"
                />
                <span>Không tự động hiển thị lại bảng này lần sau</span>
              </label>

              <button
                type="button"
                onClick={handleCloseGuide}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 tracking-wide uppercase"
              >
                Tôi Đã Hiểu & Bắt Đầu Săn Sale! 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}