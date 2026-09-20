'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ReferralPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      setProfile(prof);
      setLoading(false);
    };

    init();
  }, [router]);

  // Mã User ID dùng làm mã giới thiệu (VD: UID10001)
  const userCode = profile?.user_code || (user?.id ? `UID${user.id.substring(0, 6).toUpperCase()}` : 'UID---');
  
  // Link giới thiệu bạn bè
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://san-sale-cashback.vercel.app';
  const referralLink = `${origin}/login?ref=${userCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0F172A]/90 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center font-black text-sm text-white">
              S
            </div>
            <span className="font-extrabold text-sm text-white tracking-tight">
              SĂN SALE <span className="text-rose-500">HOÀN TIỀN</span>
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 transition"
          >
            ← Về Trang Chủ
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 pt-8">
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          {/* Banner giới thiệu */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-3xl shadow-lg shadow-rose-500/20 mb-2">
              🎁
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Mời Bạn Bè - Nhận Hoa Hồng Trọn Đời
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Chia sẻ link giới thiệu kèm Mã User ID của bạn. Mỗi khi bạn bè mua sắm và nhận hoàn tiền, bạn sẽ nhận thêm phần trăm hoa hồng thụ động!
            </p>
          </div>

          {/* Hộp mã User ID & Link giới thiệu */}
          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                Mã Giới Thiệu Của Bạn (User ID):
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black font-mono text-amber-400 tracking-wider">
                  {userCode}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                  Mã cố định
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">
                Đường Dẫn Giới Thiệu Riêng:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono select-all outline-none"
                />
                <button
                  onClick={handleCopy}
                  type="button"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shrink-0 shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5"
                >
                  <span>{copied ? '✓ Đã Sao Chép!' : '📋 Sao Chép Link'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3 Bước nhận thưởng */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Cách thức hoạt động:
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <p className="font-bold text-white">Gửi Link Mời</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Gửi đường link hoặc mã User ID trên cho bạn bè, người thân.
                </p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <p className="font-bold text-white">Bạn Bè Mua Sắm</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Họ tạo tài khoản và mua sắm nhận hoàn tiền Shopee, Lazada.
                </p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                  3
                </span>
                <p className="font-bold text-white">Nhận Thưởng</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Tiền hoa hồng giới thiệu cộng trực tiếp vào số dư ví của bạn.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}