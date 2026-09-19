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

  const ADMIN_EMAIL = 'toanzin00001@gmail.com';

  const defaultVouchers = [
    { id: '1', platform: 'Shopee', code: 'SHOPEE50K', title: 'Giảm 50K cho đơn từ 250K', category: 'Toàn sàn', expire_time: 'Hôm nay', affiliate_link: '' },
    { id: '2', platform: 'Shopee', code: 'FREESHIPXTRA', title: 'Miễn phí vận chuyển tới 70K', category: 'Freeship', expire_time: '23:59', affiliate_link: '' },
    { id: '3', platform: 'Lazada', code: 'LAZ30K', title: 'Giảm 30K đơn từ 150K', category: 'Thu thập', expire_time: 'Sắp hết', affiliate_link: '' },
    { id: '4', platform: 'TikTok', code: 'TTSHOP20', title: 'Giảm 15% cho đơn đầu tiên', category: 'Khách mới', expire_time: 'Còn 2 ngày', affiliate_link: '' },
  ];

  const loadUserProfile = async (currentUser: any) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.error('Lỗi đọc profiles:', error);
      }

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
      console.error('Lỗi khởi tạo profile:', err);
    }
  };

  const fetchVouchers = async () => {
    try {
      const { data } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setVouchers(data);
      } else {
        setVouchers(defaultVouchers);
      }
    } catch {
      setVouchers(defaultVouchers);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        await loadUserProfile(currentUser);
      }
    };

    initAuth();
    fetchVouchers();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await loadUserProfile(currentUser);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
      alert('Không thể đọc bộ nhớ tạm. Hãy dán bằng phím tắt (Ctrl + V).');
    }
  };

  const handleConvert = async () => {
    if (!inputUrl) return alert('Vui lòng dán link sản phẩm Shopee/Lazada!');
    setLoading(true);
    setAffiliateLink('');

    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalUrl: inputUrl,
          userId: user ? user.id : 'guest'
        })
      });
      const data = await res.json();
      if (data.affiliateUrl) {
        setAffiliateLink(data.affiliateUrl);
      } else {
        alert(data.error || 'Không thể tạo link hoàn tiền!');
      }
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
    if (link) {
      window.open(link, '_blank');
    }
  };

  const isUserAdmin = profile?.role === 'admin' || user?.email === ADMIN_EMAIL;
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Thành viên';
  const avatarChar = (displayName[0] || 'U').toUpperCase();

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 selection:bg-rose-500 selection:text-white font-sans">
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
                  title="Đi đến Trang cá nhân"
                  className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 hover:border-slate-500 px-2.5 py-1.5 rounded-lg shadow-inner transition cursor-pointer group"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {avatarChar}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white max-w-[100px] sm:max-w-[150px] truncate">
                    {displayName}
                  </span>
                </Link>

                {isUserAdmin && (
                  <Link
                    href="/admin"
                    className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-md shadow-rose-600/30 transition flex items-center gap-1.5"
                  >
                    <span>⚙</span> Quản trị
                  </Link>
                )}

                <Link
                  href="/profile"
                  className="text-xs bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
                >
                  <span className="text-slate-400 hidden sm:inline">Số dư:</span>
                  <span className="text-emerald-400 font-bold">
                    {Number(profile?.balance || 0).toLocaleString()}đ
                  </span>
                </Link>

                <button 
                  onClick={handleLogout} 
                  className="text-xs text-slate-400 hover:text-rose-400 transition px-2 py-1"
                >
                  Thoát
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 px-4 sm:px-5 py-2 rounded-xl transition shadow-lg shadow-rose-600/30 text-white"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none"></div>

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
            Áp dụng cho mọi sản phẩm trên Shopee, Lazada & TikTok Shop. Nhận lại tiền thật vào số dư tài khoản rút về ngân hàng.
          </p>

          <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 p-3 sm:p-4 rounded-2xl shadow-2xl shadow-black/50 text-left">
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
                className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 disabled:opacity-50 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2"
              >
                {loading ? 'Đang xử lý...' : 'Lấy Link Hoàn Tiền'}
              </button>
            </div>

            {affiliateLink && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-wide">✓ Đã gắn mã hoàn tiền thành công!</p>
                  <p className="text-xs text-slate-300 mt-0.5">Bấm vào nút bên cạnh để mở ứng dụng/trang mua hàng và ghi nhận hoàn tiền.</p>
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
          </div>
        </div>
      </section>

      {/* Danh mục Voucher */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              🔥 Mã Giảm Giá & Voucher Độc Quyền
            </h2>
            <p className="text-xs text-slate-400 mt-1">Sao chép mã trước khi bấm lấy link hoàn tiền</p>
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
    </div>
  );
}