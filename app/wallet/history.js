'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [withdraws, setWithdraws] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Lấy thông tin số dư
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (prof) setProfile(prof);

      // Lấy danh sách lịch sử rút tiền
      const { data: wds } = await supabase
        .from('withdraw_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (wds) setWithdraws(wds);

      setLoading(false);
    };

    fetchData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-slate-300 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Đang tải lịch sử rút tiền...</span>
        </div>
      </div>
    );
  }

  const username = user?.email?.split('@')[0] || 'toanzin00001';
  const balanceNumber = Number(profile?.balance);
  const safeBalance = isNaN(balanceNumber) ? 0 : balanceNumber;
  const avatarChar = username.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans selection:bg-rose-500 selection:text-white pb-16">
      {/* Top Header */}
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

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/70 px-2.5 py-1.5 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {avatarChar}
              </div>
              <span className="text-xs font-semibold text-slate-200 max-w-[120px] sm:max-w-[180px] truncate">
                {user?.email}
              </span>
            </div>

            <button 
              onClick={handleLogout} 
              className="text-xs text-slate-400 hover:text-rose-400 transition px-2 py-1"
            >
              Thoát
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-lg border border-slate-700 transition"
          >
            ← Quay lại
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-rose-400 hover:text-rose-300 px-3.5 py-1.5 rounded-lg border border-slate-700 transition"
          >
            🏠 Trang chủ
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Sidebar Menu */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl overflow-hidden shadow-xl text-center">
              <div className="h-20 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500"></div>
              <div className="px-6 pb-6 pt-0 relative flex flex-col items-center">
                <div className="w-16 h-16 -mt-8 rounded-full border-4 border-[#0F172A] bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center text-xl font-black shadow-lg">
                  {avatarChar}
                </div>
                <h3 className="font-bold text-white text-sm mt-3">{username}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{user?.email}</p>

                <div className="w-full mt-4 p-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white text-left flex items-center justify-between shadow-lg shadow-rose-600/20">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-90 block">
                      Số dư khả dụng
                    </span>
                    <span className="text-xl font-black tracking-tight">
                      {safeBalance.toLocaleString()} VNĐ
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-xl">
                    💳
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Links */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-2 shadow-xl space-y-1">
              <Link
                href="/profile"
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-700/40 text-slate-300 hover:text-white font-medium text-xs text-left transition"
              >
                <span>👤</span> Thông tin tài khoản
              </Link>
              <Link
                href="/orders"
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-700/40 text-slate-300 hover:text-white font-medium text-xs text-left transition"
              >
                <span>🛍️</span> Đơn hàng
              </Link>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-700/60 text-rose-400 font-bold text-xs text-left border border-slate-600/50">
                <span>📜</span> Lịch sử rút tiền
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 font-medium text-xs text-left transition border-t border-slate-700/50 mt-2"
              >
                <span>🚪</span> Đăng xuất
              </button>
            </div>
          </aside>

          {/* Cột phải: Bảng lịch sử rút tiền */}
          <section className="lg:col-span-8">
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-white">Lịch sử rút tiền</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Theo dõi trạng thái các lệnh chuyển khoản về tài khoản ngân hàng
                  </p>
                </div>
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white px-3.5 py-2 rounded-xl transition self-start sm:self-auto"
                >
                  Cài đặt tài khoản ngân hàng ⚙️
                </Link>
              </div>

              {withdraws.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-700/80 rounded-xl bg-slate-900/40">
                  <div className="text-4xl mb-3">💸</div>
                  <p className="text-sm font-semibold text-slate-300">Chưa có giao dịch rút tiền nào</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Khi số dư trên 10.000 VNĐ, hệ thống sẽ tự động thanh toán hoặc bạn gửi lệnh rút tiền thì lịch sử sẽ xuất hiện tại đây.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">Thời gian</th>
                        <th className="py-3 px-3">Số tiền</th>
                        <th className="py-3 px-3">Ngân hàng nhận</th>
                        <th className="py-3 px-3 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {withdraws.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-700/20 transition">
                          <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                            {new Date(item.created_at).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-3 font-bold text-rose-400 whitespace-nowrap text-sm">
                            {Number(item.amount).toLocaleString()} đ
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-200">{item.bank_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {item.account_number} {item.account_holder ? `• ${item.account_holder}` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            {item.status === 'completed' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ✓ Đã chuyển khoản
                              </span>
                            ) : item.status === 'rejected' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                ✕ Bị từ chối
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                ⏳ Đang xử lý
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}