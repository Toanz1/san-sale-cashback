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
  const [errorMessage, setErrorMessage] = useState('');
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
      setErrorMessage('Không thể đọc bộ nhớ tạm. Hãy dùng phím tắt (Ctrl + V).');
    }
  };

  const handleConvert = async () => {
    if (!inputUrl.trim()) {
      setErrorMessage('Vui lòng dán link sản phẩm (Shopee, Lazada, TikTok)!');
      return;
    }
    setLoading(true);
    setAffiliateLink('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalUrl: inputUrl.trim(), userId: user ? user.id : 'guest' })
      });
      const data = await res.json();
      if (data.affiliateUrl) {
        setAffiliateLink(data.affiliateUrl);
      } else {
        setErrorMessage(data.error || 'Không thể tạo link hoàn tiền!');
      }
    } catch {
      setErrorMessage('Đã xảy ra lỗi kết nối khi tạo link!');
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
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0F172A] text-slate-100 font-sans selection:bg-rose-500 selection:text-white flex flex-col justify-between">
      
      {/* HEADER TỐI ƯU RESPONSIVE KHÔNG TRÀN MÉP */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0F172A]/90 border-b border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3 w-full max-w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          
          {/* Logo bên trái */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center font-black text-base sm:text-xl shadow-lg shadow-rose-500/20 text-white">
              S
            </div>
            <div>
              <span className="font-extrabold text-xs sm:text-base tracking-tight text-white whitespace-nowrap">
                SĂN SALE <span className="text-rose-500 font-black">HOÀN TIỀN</span>
              </span>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-wider uppercase hidden sm:block">Cashback Sàn TMĐT</p>
            </div>
          </Link>

          {/* Menu Điều Hướng & Tài Khoản bên phải */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            
            {/* Nút thao tác Admin */}
            {isUserAdmin && (
              <div className="flex items-center gap-1">
                <Link
                  href="/admin/orders"
                  title="Duyệt đơn Shopee"
                  className="text-[11px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-1.5 rounded-lg transition flex items-center gap-1"
                >
                  <span>📊</span>
                  <span className="hidden sm:inline">Duyệt đơn</span>
                </Link>
                <Link
                  href="/admin"
                  title="Trang quản trị"
                  className="text-[11px] bg-rose-600 hover:bg-rose-500 text-white font-bold px-2 py-1.5 rounded-lg transition flex items-center gap-1"
                >
                  <span>⚙</span>
                  <span className="hidden sm:inline">Quản trị</span>
                </Link>
              </div>
            )}

            {/* Trạng thái đăng nhập người dùng */}
            {user ? (
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 px-1.5 sm:px-2 py-1.5 rounded-lg transition max-w-[70px] sm:max-w-[120px]"
                >
                  <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                    {avatarChar}
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-200 truncate">
                    {displayName}
                  </span>
                </Link>

                <Link
                  href="/profile"
                  className="text-[10px] sm:text-xs bg-slate-800 hover:bg-slate-700/80 border border-slate-700 px-1.5 sm:px-2 py-1.5 rounded-lg flex items-center transition shrink-0"
                >
                  <span className="text-emerald-400 font-bold">
                    {Number(profile?.balance || 0).toLocaleString()}đ
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="text-[10px] sm:text-xs text-slate-400 hover:text-rose-400 transition px-1 py-1 font-medium shrink-0"
                >
                  Thoát
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 px-3 py-1.5 sm:py-2 rounded-xl transition shadow text-white shrink-0"
              >
                Đăng nhập
              </Link>
            )}
          </div>

        </div>
      </header>

      {/* HERO SECTION & FORM CHUYỂN LINK */}
      <section className="relative overflow-hidden pt-8 sm:pt-12 pb-12 px-4 w-full max-w-full">
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase tracking-wide mb-4">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            Hoàn tiền tự động Shopee, Lazada, TikTok Shop
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-snug sm:leading-tight mb-3">
            Dán Link Sản Phẩm. <br />
            <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              Nhận Lại Tiền Khi Mua Sắm.
            </span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-base max-w-xl mx-auto mb-6">
            Áp dụng cho mọi sản phẩm trên các sàn TMĐT. Rút tiền về ngân hàng nhanh chóng và minh bạch.
          </p>

          {/* Ô input dán link */}
          <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 p-3 sm:p-4 rounded-2xl shadow-2xl text-left w-full">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full flex items-center">
                <input
                  type="text"
                  placeholder="Dán link sản phẩm (Shopee, Lazada, TikTok)..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 rounded-xl pl-3.5 pr-20 py-3.5 outline-none focus:border-rose-500 transition"
                />
                <button
                  onClick={handlePasteClipboard}
                  type="button"
                  className="absolute right-2 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-lg transition"
                >
                  Dán nhanh
                </button>
              </div>

              <button
                onClick={handleConvert}
                disabled={loading}
                type="button"
                className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <span>Lấy Link Hoàn Tiền</span>
                )}
              </button>
            </div>

            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Hiển thị kết quả link hoàn tiền thành công */}
            {affiliateLink && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
                <div>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide">✓ Tạo link hoàn tiền thành công!</p>
                  <p className="text-xs text-slate-300 mt-0.5">Bấm nút để đi đến ứng dụng mua hàng và ghi nhận hoa hồng.</p>
                </div>
                <a
                  href={affiliateLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto text-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase px-5 py-2.5 rounded-lg shadow transition shrink-0"
                >
                  Đi Tới Mua Hàng ➔
                </a>
              </div>
            )}

            {/* Nút bấm mở lại Hướng Dẫn */}
            <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-400">💡 Mua sắm lần đầu?</span>
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="text-amber-400 hover:text-amber-300 font-bold hover:underline flex items-center gap-1 transition text-right"
              >
                <span>📖 Hướng dẫn nhận hoàn tiền 100%</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SẢN PHẨM BÁN CHẠY (HOT DEALS) */}
      {hotProducts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-12 w-full">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white">
                🔥 Sản Phẩm Bán Chạy Hoàn Tiền Khủng
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Bấm mua ngay để nhận hoa hồng hoàn tiền trực tiếp</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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

                    <div className="p-2.5 sm:p-3">
                      <p className="text-xs font-semibold text-white line-clamp-2 leading-snug group-hover:text-rose-400 transition">
                        {p.title}
                      </p>
                      
                      <div className="mt-2 flex items-baseline gap-1 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-rose-400">
                          {Number(p.price).toLocaleString()}đ
                        </span>
                        {Number(p.original_price) > Number(p.price) && (
                          <span className="text-[10px] text-slate-500 line-through">
                            {Number(p.original_price).toLocaleString()}đ
                          </span>
                        )}
                      </div>

                      <div className="mt-2 py-1 px-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                        <span className="text-[10px] text-slate-300">Hoàn tiền:</span>
                        <span className="text-[11px] font-black text-emerald-400">
                          +{estimatedCashback.toLocaleString()}đ
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 pt-0">
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

      {/* DANH MỤC VOUCHER */}
      <section className="max-w-6xl mx-auto px-4 pb-16 w-full">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white">
              🎟️ Mã Giảm Giá & Voucher Độc Quyền
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Sao chép mã ưu đãi trước khi mua sắm</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
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
                  <span className="font-mono text-xs font-bold text-rose-400 tracking-wider bg-rose-500/10 px-2 py-1 rounded truncate">
                    {v.code}
                  </span>
                  <button
                    onClick={() => handleCopyCode(v)}
                    type="button"
                    className="text-xs font-semibold text-slate-200 hover:text-white bg-rose-600 hover:bg-rose-500 px-3 py-1.5 rounded-lg transition shadow-sm flex items-center gap-1 shrink-0"
                  >
                    <span>{copiedVoucher === v.code ? '✓ Đã chép' : 'Sao chép'}</span>
                    {hasLink && <span className="text-[10px]">➔</span>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 py-6 px-4 text-center text-xs text-slate-500 bg-[#0b1120] w-full">
        <p>© 2026 Săn Sale Hoàn Tiền. Nền tảng mua sắm thông minh tối ưu hóa cashback.</p>
      </footer>

      {/* MODAL HƯỚNG DẪN MUA SẮM */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-5 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                📖 Quy Trình Hoàn Tiền 100% Thành Công
              </h3>
              <button
                type="button"
                onClick={handleCloseGuide}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex gap-3 items-start bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-black flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <div>
                  <h4 className="font-bold text-white mb-0.5">Sao chép link sản phẩm</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Vào ứng dụng Shopee, Lazada hoặc TikTok Shop, chọn sản phẩm cần mua và bấm <strong>Chia sẻ ➔ Sao chép liên kết</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-black flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <div>
                  <h4 className="font-bold text-white mb-0.5">Dán link vào hệ thống</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Dán link vào ô tìm kiếm ở trang chủ, bấm <strong>Lấy Link Hoàn Tiền</strong>, sau đó nhấn <strong>Đi Tới Mua Hàng</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-black flex items-center justify-center shrink-0 text-xs">
                  3
                </span>
                <div>
                  <h4 className="font-bold text-white mb-0.5">Thanh toán đơn hàng</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Tiến hành mua hàng bình thường trên app. Tiền hoàn sẽ được ghi nhận vào tài khoản sau khi hoàn tất đơn.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
                <p className="font-bold">⚠️ Lưu ý quan trọng:</p>
                <ul className="list-disc list-inside text-amber-200/80 space-y-0.5 text-[11px] leading-relaxed">
                  <li>Không bấm qua link giới thiệu khác sau khi đã lấy link từ hệ thống.</li>
                  <li>Thanh toán ngay trên thiết bị vừa mở link.</li>
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
                <span>Không tự động hiện lại bảng này lần sau</span>
              </label>

              <button
                type="button"
                onClick={handleCloseGuide}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 tracking-wide uppercase"
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