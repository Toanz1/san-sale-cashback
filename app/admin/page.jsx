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

  // State thêm voucher mới
  const [newVoucher, setNewVoucher] = useState({
    platform: 'Shopee',
    code: '',
    title: '',
    category: 'Toàn sàn',
    expire_time: 'Hôm nay',
    link: ''
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

      // 2. Rút tiền
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

    const { data, error } = await supabase
      .from('withdrawals')
      .update({ status: 'completed' })
      .eq('id', withdraw.id)
      .select();

    if (error) {
      alert('Lỗi cập nhật Supabase: ' + error.message);
      return;
    }

    if (!data || data.length === 0) {
      alert('Không thể cập nhật hoặc bị RLS chặn quyền!');
      return;
    }

    alert('Duyệt rút tiền thành công!');
    fetchAllData();
  };

  const handleRejectWithdrawal = async (withdraw) => {
    const reason = prompt('Nhập lý do từ chối (Tiền sẽ được hoàn trả lại ví user):', 'Sai thông tin số tài khoản');
    if (reason === null) return;

    const { data: updatedWithdrawal, error: withdrawErr } = await supabase
      .from('withdrawals')
      .update({ status: 'rejected', note: reason })
      .eq('id', withdraw.id)
      .select();

    if (withdrawErr) {
      alert('Lỗi cập nhật lệnh rút: ' + withdrawErr.message);
      return;
    }

    if (!updatedWithdrawal || updatedWithdrawal.length === 0) {
      alert('Không thể từ chối hoặc bị RLS chặn quyền trên bảng withdrawals!');
      return;
    }

    // Hoàn tiền về số dư tài khoản
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', withdraw.user_id)
      .single();

    const currentBalance = Number(currentProfile?.balance || 0);
    const newBalance = currentBalance + Number(withdraw.amount || 0);

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', withdraw.user_id);

    if (profileErr) {
      alert('Đã từ chối lệnh nhưng hoàn tiền vào ví lỗi: ' + profileErr.message);
    } else {
      alert(`Đã từ chối và hoàn lại ${Number(withdraw.amount || 0).toLocaleString()}đ vào ví của thành viên!`);
    }

    fetchAllData();
  };

  // ================= THAO TÁC QUẢN LÝ VOUCHER =================
  const handleAddVoucher = async (e) => {
    e.preventDefault();
    if (!newVoucher.code || !newVoucher.title) {
      alert('Vui lòng nhập đầy đủ mã và tiêu đề voucher!');
      return;
    }

    const { error } = await supabase.from('vouchers').insert([
      {
        platform: newVoucher.platform,
        code: newVoucher.code.toUpperCase().trim(),
        title: newVoucher.title,
        category: newVoucher.category,
        expire_time: newVoucher.expire_time
      }
    ]);

    if (error) {
      alert('Lỗi thêm voucher: ' + error.message);
    } else {
      alert('Thêm voucher thành công!');
      setNewVoucher({
        platform: 'Shopee',
        code: '',
        title: '',
        category: 'Toàn sàn',
        expire_time: 'Hôm nay',
        link: ''
      });
      fetchAllData();
    }
  };

  const handleDeleteVoucher = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa voucher này không?')) return;
    const { error } = await supabase.from('vouchers').delete().eq('id', id);
    if (error) alert('Lỗi xóa: ' + error.message);
    else fetchAllData();
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

  const filteredUsers = users.filter((u) =>
    (u.email || '').toLowerCase().includes(searchUser.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(searchUser.toLowerCase())
  );

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
        {/* Khối 4 Thẻ Thống Kê Tổng Quan */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Tổng Thành Viên
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white">{users.length}</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Tổng Đơn Ghi Nhận
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-400">{orders.length}</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Tiền Chờ Rút (Pending)
            </span>
            <span className="text-2xl sm:text-3xl font-black text-rose-400">
              {totalPendingWithdrawal.toLocaleString()}đ
            </span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Voucher Hoạt Động
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">{vouchers.length}</span>
          </div>
        </div>

        {/* Thanh chuyển TAB đầy đủ */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition relative shrink-0 flex items-center gap-2 ${
              activeTab === 'withdrawals'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            <span>💸 Quản Lý Rút Tiền</span>
            {withdrawals.filter((w) => w?.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-amber-400 text-slate-900 rounded-full font-black">
                {withdrawals.filter((w) => w?.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'users'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            👥 Quản Lý Thành Viên ({users.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'orders'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            🛍️ Đơn Hoàn Tiền ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('vouchers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'vouchers'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            🎟️ Quản Lý Voucher ({vouchers.length})
          </button>
        </div>

        {/* ================= TAB 1: BẢNG RÚT TIỀN ================= */}
        {activeTab === 'withdrawals' && (
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
                          {w?.note && (
                            <div className="text-[10px] text-rose-400 italic mt-0.5">
                              Lý do: {w?.note}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {formatDate(w?.created_at)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {(w?.status === 'completed' || w?.status === 'approved') && (
                            <span className="px-2.5 py-1 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                              Đã chuyển khoản
                            </span>
                          )}
                          {w?.status === 'pending' && (
                            <span className="px-2.5 py-1 text-[10px] rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold animate-pulse">
                              Chờ xử lý
                            </span>
                          )}
                          {w?.status === 'rejected' && (
                            <span className="px-2.5 py-1 text-[10px] rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                              Đã từ chối
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {w?.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveWithdrawal(w)}
                                className="px-3 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                              >
                                Duyệt
                              </button>
                              <button
                                onClick={() => handleRejectWithdrawal(w)}
                                className="px-3 py-1 text-[11px] font-bold bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg transition"
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs font-medium">Đã chốt</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 2: QUẢN LÝ THÀNH VIÊN ================= */}
        {activeTab === 'users' && (
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-bold text-white">Danh Sách Thành Viên Đã Đăng Ký</h2>
              <input
                type="text"
                placeholder="Tìm email hoặc tên..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full sm:w-64 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 uppercase text-[11px]">
                    <th className="py-3 px-4">Họ Tên / Email</th>
                    <th className="py-3 px-4">Số Điện Thoại</th>
                    <th className="py-3 px-4">Tài Khoản Ngân Hàng</th>
                    <th className="py-3 px-4">Số Dư Khả Dụng</th>
                    <th className="py-3 px-4">Vai Trò</th>
                    <th className="py-3 px-4">Ngày Tham Gia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500">
                        Không tìm thấy thành viên phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-700/20">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{u.full_name || 'Chưa đặt tên'}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono">
                          {u.phone || 'Chưa có'}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {u.bank_name ? (
                            <div>
                              <span>{u.bank_name}</span> - <span className="font-mono text-slate-400">{u.bank_account}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Chưa liên kết</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-400 text-sm">
                          {Number(u.balance || 0).toLocaleString()}đ
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'admin' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {u.role || 'user'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {formatDate(u.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: ĐƠN HOÀN TIỀN ================= */}
        {activeTab === 'orders' && (
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-bold text-white mb-4">Danh Sách Đơn Hàng Hoàn Tiền Đã Ghi Nhận</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 uppercase text-[11px]">
                    <th className="py-3 px-4">Mã Đơn</th>
                    <th className="py-3 px-4">Sàn</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Tiền Hoàn</th>
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500">
                        Chưa có đơn hàng nào được ghi nhận từ sàn
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-700/20">
                        <td className="py-3 px-4 font-mono font-bold text-white">{o.order_id}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-200 text-[10px] font-bold">
                            {o.platform || 'Shopee'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{getUserEmail(o.user_id)}</td>
                        <td className="py-3 px-4 font-bold text-emerald-400">
                          +{Number(o.cashback_amount || 0).toLocaleString()}đ
                        </td>
                        <td className="py-3 px-4 text-slate-400">{formatDate(o.created_at)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            o.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {o.status === 'approved' ? 'Đã duyệt' : 'Đang xử lý'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 4: QUẢN LÝ VOUCHER ================= */}
        {activeTab === 'vouchers' && (
          <div className="space-y-6">
            {/* Form thêm Voucher */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4">Thêm Mã Giảm Giá Mới</h2>
              <form onSubmit={handleAddVoucher} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Sàn TMĐT</label>
                  <select
                    value={newVoucher.platform}
                    onChange={(e) => setNewVoucher({ ...newVoucher, platform: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-rose-500"
                  >
                    <option value="Shopee">Shopee</option>
                    <option value="Lazada">Lazada</option>
                    <option value="TikTok">TikTok Shop</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Mã Voucher</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: SHOPEE50K"
                    value={newVoucher.code}
                    onChange={(e) => setNewVoucher({ ...newVoucher, code: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono uppercase outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Tiêu đề / Mức giảm</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Giảm 50K đơn từ 250K"
                    value={newVoucher.title}
                    onChange={(e) => setNewVoucher({ ...newVoucher, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Loại / Hạn dùng</label>
                  <input
                    type="text"
                    placeholder="VD: Freeship, Hôm nay"
                    value={newVoucher.expire_time}
                    onChange={(e) => setNewVoucher({ ...newVoucher, expire_time: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-lg shadow-rose-600/30"
                >
                  + Thêm Voucher
                </button>
              </form>
            </div>

            {/* Danh sách Voucher hiện có */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4">Danh Sách Voucher Đang Hiển Thị Trên Web</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 uppercase text-[11px]">
                      <th className="py-3 px-4">Sàn</th>
                      <th className="py-3 px-4">Mã Voucher</th>
                      <th className="py-3 px-4">Nội Dung Ưu Đãi</th>
                      <th className="py-3 px-4">Hạn Dùng</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {vouchers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-500">
                          Chưa có voucher nào trong Database
                        </td>
                      </tr>
                    ) : (
                      vouchers.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-700/20">
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-200 text-[10px] font-bold">
                              {v.platform}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-rose-400">{v.code}</td>
                          <td className="py-3 px-4 font-semibold text-white">{v.title}</td>
                          <td className="py-3 px-4 text-slate-400">{v.expire_time || 'Hôm nay'}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteVoucher(v.id)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition border border-rose-500/30"
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}