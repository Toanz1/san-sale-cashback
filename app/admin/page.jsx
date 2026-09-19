'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('withdrawals');
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [orders, setOrders] = useState([]);
  const [vouchers, setVouchers] = useState([]);

  const [newVoucher, setNewVoucher] = useState({
    platform: 'Shopee',
    code: '',
    description: '',
    tag: 'Toàn sàn',
    expires: 'Hôm nay',
    targetUrl: ''
  });

  const [searchUser, setSearchUser] = useState('');

  const fetchAllData = async () => {
    setLoading(true);

    try {
      // 1. Thành viên
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      setUsers(usersData || []);

      // 2. Rút tiền (không join bảng để tránh crash ngầm)
      const { data: withData, error: withErr } = await supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false });
      if (withErr) console.error('Lỗi withdrawals:', withErr.message);
      setWithdrawals(withData || []);

      // 3. Đơn hàng hoàn tiền
      const { data: ordData } = await supabase
        .from('cashback_orders')
        .select('*')
        .order('created_at', { ascending: false });
      setOrders(ordData || []);

      // 4. Voucher
      const { data: vouData } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });
      setVouchers(vouData || []);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu:', err);
    }

    setLoading(false);
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      fetchAllData();
    };
    checkAdmin();
  }, [router]);

  // ================= THAO TÁC DUYỆT RÚT TIỀN =================
  const handleApproveWithdrawal = async (withdraw) => {
    if (!confirm(`Xác nhận đã chuyển khoản ${Number(withdraw.amount || 0).toLocaleString()}đ cho khách?`)) return;

    const { error } = await supabase
      .from('withdrawals')
      .update({ status: 'completed' })
      .eq('id', withdraw.id);

    if (error) {
      alert('Lỗi: ' + error.message);
    } else {
      alert('Duyệt rút tiền thành công!');
      fetchAllData();
    }
  };

  const handleRejectWithdrawal = async (withdraw) => {
    const reason = prompt('Nhập lý do từ chối (Tiền sẽ được hoàn trả lại ví user):', 'Sai thông tin số tài khoản');
    if (reason === null) return;

    await supabase.from('withdrawals').update({ status: 'rejected', note: reason }).eq('id', withdraw.id);

    const targetUser = users.find((u) => String(u.id) === String(withdraw.user_id));
    const currentBalance = Number(targetUser?.balance || 0);
    const newBalance = currentBalance + Number(withdraw.amount || 0);

    await supabase.from('profiles').update({ balance: newBalance }).eq('id', withdraw.user_id);

    alert('Đã từ chối lệnh và hoàn lại tiền vào ví của thành viên!');
    fetchAllData();
  };

  // Helper tìm email user an toàn
  const getUserEmail = (userId) => {
    if (!userId) return 'Không rõ';
    const found = users.find((u) => String(u.id) === String(userId));
    return found?.email || String(userId).slice(0, 8);
  };

  // Helper format ngày an toàn
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Vừa xong';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 'Vừa xong' : d.toLocaleDateString('vi-VN');
    } catch {
      return 'Vừa xong';
    }
  };

  const totalPendingWithdrawal = (withdrawals || [])
    .filter((w) => w?.status === 'pending')
    .reduce((sum, item) => sum + Number(item?.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans selection:bg-rose-500 selection:text-white pb-24">
      {/* Header Admin */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0F172A]/90 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-rose-600 text-white font-black text-xs px-2.5 py-1 rounded-md tracking-wider">
              ADMIN PANEL
            </span>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg text-white leading-none">
                Hệ Thống Quản Trị Trung Tâm
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-1">
                Giám sát người dùng, dòng tiền rút và đơn hoàn tiền sàn
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl border border-slate-700 transition"
          >
            ← Về Trang Chủ
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6">
        {/* Khối thống kê tổng quan */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Tổng Thành Viên
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white">{users.length}</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Tổng Đơn Ghi Nhận
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-400">{orders.length}</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Tiền Chờ Rút (Pending)
            </span>
            <span className="text-2xl sm:text-3xl font-black text-rose-400">
              {totalPendingWithdrawal.toLocaleString()}đ
            </span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Voucher Hoạt Động
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">{vouchers.length}</span>
          </div>
        </div>

        {/* Menu chuyển TAB */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition relative shrink-0 ${
              activeTab === 'withdrawals'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            💸 Quản Lý Rút Tiền
            {withdrawals.filter((w) => w?.status === 'pending').length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-amber-400 text-slate-900 rounded-full font-black">
                {withdrawals.filter((w) => w?.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {/* BẢNG RÚT TIỀN */}
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
          <h2 className="text-base font-bold text-white mb-4">
            Danh Sách Yêu Cầu Rút Tiền Của Thành Viên
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 uppercase text-[11px]">
                  <th className="py-3 px-4">Mã Lệnh</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Số Tiền</th>
                  <th className="py-3 px-4">Thông Tin Nhận Tiền</th>
                  <th className="py-3 px-4">Thời Gian</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      Chưa có yêu cầu rút tiền nào
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={String(w?.id)} className="hover:bg-slate-700/20">
                      <td className="py-3 px-4 font-mono font-bold text-slate-300">
                        #{String(w?.id || '').slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {getUserEmail(w?.user_id)}
                      </td>
                      <td className="py-3 px-4 font-bold text-rose-400 text-sm">
                        {Number(w?.amount || 0).toLocaleString()}đ
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div>
                          <span className="font-bold text-white">{w?.bank_name || 'Ngân hàng'}</span> - {w?.bank_account || w?.account_number || 'N/A'}
                        </div>
                        {(w?.account_holder || w?.account_name) && (
                          <div className="text-[11px] text-slate-400 uppercase">
                            Chủ TK: {w?.account_holder || w?.account_name}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {formatDate(w?.created_at)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {(w?.status === 'completed' || w?.status === 'approved') && (
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            Đã chuyển khoản
                          </span>
                        )}
                        {w?.status === 'pending' && (
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold animate-pulse">
                            Chờ xử lý
                          </span>
                        )}
                        {w?.status === 'rejected' && (
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                            Đã từ chối
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {w?.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApproveWithdrawal(w)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleRejectWithdrawal(w)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg transition"
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">Đã chốt</span>
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