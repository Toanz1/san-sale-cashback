'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function WalletHistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWalletData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // 1. Lấy thông tin số dư tài khoản
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (prof) setProfile(prof);

      // 2. Lấy danh sách lịch sử rút tiền
      const { data: list } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (list) setWithdrawals(list);
      setLoading(false);
    };

    loadWalletData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center text-slate-300 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Đang tải lịch sử rút tiền...</span>
        </div>
      </div>
    );
  }

  const userEmail = user?.email || 'toanzin00001@gmail.com';
  const avatarChar = userEmail.charAt(0).toUpperCase();
  const safeBalance = Number(profile?.balance || 0);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans selection:bg-rose-500 selection:text-white pb-20">
      {/* Header đồng bộ */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0B1120]/90 border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-orange-500/30">
              S
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-white block leading-none">
                SĂN SALE <span className="text-[#FF2E63]">HOÀN TIỀN</span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-1">
                CASHBACK SÀN TMĐT
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2.5 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 pl-1.5 pr-4 py-1.5 rounded-xl transition shadow-sm"
            >
              <div className="w-6 h-6 rounded-full bg-[#FF2E63] text-white flex items-center justify-center text-xs font-black shrink-0">
                {avatarChar}
              </div>
              <span className="text-xs font-semibold text-slate-200 tracking-tight max-w-[150px] sm:max-w-none truncate">
                {userEmail}
              </span>
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs font-medium text-slate-400 hover:text-rose-400 transition px-2 py-1"
            >
              Thoát
            </button>
          </div>
        </div>
      </header>

      {/* Nội dung trang */}
      <main className="max-w-6xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-2.5 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-slate-700 transition"
          >
            ← Quay lại
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-rose-400 hover:text-rose-300 px-3.5 py-1.5 rounded-xl border border-slate-700 transition"
          >
            🏠 Trang chủ
          </Link>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-6">
          Lịch Sử Rút Tiền
        </h1>

        {/* Khung số dư */}
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Số dư khả dụng hiện tại
            </span>
            <span className="text-3xl font-black text-rose-500 mt-1 block">
              {safeBalance.toLocaleString()} VNĐ
            </span>
            <p className="text-xs text-slate-400 mt-1">
              * Hệ thống tự động chuyển khoản vào ngày 17 và 27 hàng tháng khi số dư đạt trên 10K.
            </p>
          </div>

          <Link
            href="/profile"
            className="self-start sm:self-center bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-600 transition"
          >
            Kiểm tra STK nhận tiền ➔
          </Link>
        </div>

        {/* Bảng danh sách rút tiền */}
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-700 text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-bold">Mã GD</th>
                  <th className="py-3.5 px-4 font-bold">Số tiền rút</th>
                  <th className="py-3.5 px-4 font-bold">Ngân hàng thụ hưởng</th>
                  <th className="py-3.5 px-4 font-bold">Thời gian</th>
                  <th className="py-3.5 px-4 font-bold text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-slate-400">
                      <div className="text-3xl mb-2">📜</div>
                      <p className="font-semibold">Chưa có giao dịch rút tiền nào</p>
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-700/20 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                        #{item.id?.slice(0, 8)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-rose-400 whitespace-nowrap text-sm">
                        -{Number(item.amount || 0).toLocaleString()} đ
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {item.bank_name} - {item.bank_account}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.status === 'completed' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Thành công
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Đang xử lý
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}