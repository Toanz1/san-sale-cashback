'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function OrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States bộ lọc tìm kiếm
  const [searchCode, setSearchCode] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const fetchOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Lấy danh sách đơn hàng hoàn tiền từ bảng cashback_orders
      const { data: ords } = await supabase
        .from('cashback_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ords) setOrders(ords);
      setLoading(false);
    };

    fetchOrders();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Tính toán số liệu cho 4 thẻ thống kê
  const totalOrders = orders.length;
  const processingOrders = orders.filter((o) => o.status === 'pending').length;
  const completedOrders = orders.filter((o) => o.status === 'approved').length;
  const totalCashback = orders
    .filter((o) => o.status === 'approved')
    .reduce((sum, o) => sum + Number(o.cashback_amount || 0), 0);

  // Lọc danh sách theo từ khóa mã đơn và loại đơn
  const filteredOrders = orders.filter((item) => {
    const matchCode = searchCode
      ? item.order_id?.toLowerCase().includes(searchCode.trim().toLowerCase())
      : true;
    const matchType = filterType === 'all' ? true : item.status === filterType;
    return matchCode && matchType;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center text-slate-300 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Đang tải danh sách đơn hàng...</span>
        </div>
      </div>
    );
  }

  const userEmail = user?.email || 'toanzin00001@gmail.com';
  const avatarChar = userEmail.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans selection:bg-rose-500 selection:text-white pb-20">
      
      {/* 1. THANH HEADER ĐỒNG BỘ CHÍNH XÁC VỚI WEB (HÌNH 2) */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0B1120]/90 border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo bên trái: Khối vuông bo góc chữ S gradient cam đỏ */}
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

          {/* Khu vực bên phải: Khối tài khoản có icon tròn hồng + Nút Thoát */}
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

      {/* 2. NỘI DUNG CHÍNH */}
      <main className="max-w-6xl mx-auto px-4 pt-6">
        
        {/* Hàng nút điều hướng */}
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

        {/* Tiêu đề trang */}
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-6">
          Danh Sách Đơn Hàng
        </h1>

        {/* 4 Card Thống Kê Ngang */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Tổng đơn hàng
              </span>
              <span className="text-2xl font-black text-white mt-1 block">
                {totalOrders}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-lg">
              👜
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Đang xử lý
              </span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">
                {processingOrders}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-lg">
              🔄
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Hoàn thành
              </span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                {completedOrders}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
              ✅
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Tổng hoàn tiền
              </span>
              <span className="text-2xl font-black text-rose-500 mt-1 block">
                {totalCashback.toLocaleString()} VNĐ
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-lg">
              💵
            </div>
          </div>
        </div>

        {/* Khung Thông Báo Cập Nhật */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3 shadow-md">
          <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black shrink-0">
            i
          </div>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            Cập nhật dữ liệu sau khoảng 1 ngày. Ví dụ ngày 1/3/2026 đặt đơn thì khoảng trưa/chiều ngày 2/3/2026 sẽ hiển thị đơn ở đây.
          </p>
        </div>

        {/* Thanh Tìm Kiếm & Bộ Lọc */}
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 mb-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Mã đơn hàng
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Lọc mã đơn..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500 transition"
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Loại đơn
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-rose-500 transition"
              >
                <option value="all">Tất cả loại đơn</option>
                <option value="pending">Đang xử lý (Chờ duyệt)</option>
                <option value="approved">Hoàn thành (Đã duyệt)</option>
                <option value="rejected">Đã hủy đơn</option>
              </select>
            </div>

            <div className="md:col-span-4 flex gap-2">
              <button
                onClick={() => {}}
                className="flex-1 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-rose-600/30 transition"
              >
                Tìm kiếm
              </button>
              <button
                onClick={() => {
                  setSearchCode('');
                  setFilterType('all');
                }}
                className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-semibold transition"
              >
                Tất cả đơn
              </button>
            </div>
          </div>
        </div>

        {/* Bảng Danh Sách Đơn Hàng */}
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-700 text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-bold">STT</th>
                  <th className="py-3.5 px-4 font-bold">LOẠI</th>
                  <th className="py-3.5 px-4 font-bold">MÃ ĐƠN HÀNG</th>
                  <th className="py-3.5 px-4 font-bold">TÊN SẢN PHẨM</th>
                  <th className="py-3.5 px-4 font-bold">TIỀN HOÀN</th>
                  <th className="py-3.5 px-4 font-bold">NGÀY MUA</th>
                  <th className="py-3.5 px-4 font-bold text-center">TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400">
                      <div className="text-3xl mb-2">📋</div>
                      <p className="font-semibold">Chưa có đơn hàng hợp lệ</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-700/20 transition">
                      <td className="py-3.5 px-4 text-slate-400 font-medium">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-[10px] uppercase">
                          {item.platform || 'TMĐT'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                        {item.order_id}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-300">
                        {item.product_name || 'Đơn hàng mua sắm hoàn tiền'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400 whitespace-nowrap text-sm">
                        +{Number(item.cashback_amount || 0).toLocaleString()} đ
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.status === 'approved' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Hoàn thành
                          </span>
                        ) : item.status === 'rejected' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Đã hủy
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