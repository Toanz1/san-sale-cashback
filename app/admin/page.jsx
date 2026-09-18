'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPage() {
  const router = useRouter();

  // Tab state: 'overview' | 'withdrawals' | 'users' | 'orders'
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Dữ liệu quản trị
  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [orders, setOrders] = useState([]);
  const [vouchers, setVouchers] = useState([]);

  // Form thêm Voucher mới
  const [newVoucher, setNewVoucher] = useState({
    platform: 'Shopee',
    code: '',
    description: '',
    tag: 'Toàn sàn',
    expires: 'Hôm nay'
  });

  // Tìm kiếm người dùng
  const [searchUser, setSearchUser] = useState('');

  // Tải toàn bộ dữ liệu hệ thống
  const fetchAllData = async () => {
    setLoading(true);

    // 1. Lấy danh sách thành viên
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (usersData) setUsers(usersData);

    // 2. Lấy danh sách yêu cầu rút tiền
    const { data: withData } = await supabase
      .from('withdrawals')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false });
    if (withData) setWithdrawals(withData);

    // 3. Lấy danh sách đơn hàng
    const { data: ordData } = await supabase
      .from('orders')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false });
    if (ordData) setOrders(ordData);

    // 4. Lấy danh sách voucher
    const { data: vouData } = await supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false });
    if (vouData) setVouchers(vouData);

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

  // ================= THAO TÁC VOUCHER =================
  const handleAddVoucher = async (e) => {
    e.preventDefault();
    if (!newVoucher.code || !newVoucher.description) {
      return alert('Vui lòng nhập đầy đủ mã và mô tả voucher!');
    }
    const { error } = await supabase.from('vouchers').insert([newVoucher]);
    if (error) {
      alert('Lỗi thêm voucher: ' + error.message);
    } else {
      alert('Đăng voucher thành công!');
      setNewVoucher({ platform: 'Shopee', code: '', description: '', tag: 'Toàn sàn', expires: 'Hôm nay' });
      fetchAllData();
    }
  };

  const handleDeleteVoucher = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa mã giảm giá này?')) return;
    await supabase.from('vouchers').delete().eq('id', id);
    fetchAllData();
  };

  // ================= THAO TÁC DUYỆT RÚT TIỀN =================
  const handleApproveWithdrawal = async (withdraw) => {
    if (!confirm(`Xác nhận đã chuyển khoản ${Number(withdraw.amount).toLocaleString()}đ cho khách?`)) return;
    
    // Cập nhật trạng thái thành completed
    const { error } = await supabase
      .from('withdrawals')
      .update({ status: 'completed' })
      .eq('id', withdraw.id);

    if (error) alert('Lỗi: ' + error.message);
    else {
      alert('Duyệt rút tiền thành công!');
      fetchAllData();
    }
  };

  const handleRejectWithdrawal = async (withdraw) => {
    const reason = prompt('Nhập lý do từ chối (Tiền sẽ được hoàn trả lại ví user):', 'Sai thông tin số tài khoản');
    if (reason === null) return;

    // 1. Cập nhật trạng thái lệnh rút sang rejected
    await supabase.from('withdrawals').update({ status: 'rejected', note: reason }).eq('id', withdraw.id);

    // 2. Hoàn lại số dư cho User
    const targetUser = users.find((u) => u.id === withdraw.user_id);
    const newBalance = Number(targetUser?.balance || 0) + Number(withdraw.amount);

    await supabase.from('profiles').update({ balance: newBalance }).eq('id', withdraw.user_id);

    alert('Đã từ chối lệnh và hoàn lại tiền vào ví của thành viên!');
    fetchAllData();
  };

  // ================= THAO TÁC CỘNG / TRỪ TIỀN THỦ CÔNG =================
  const handleAdjustBalance = async (user) => {
    const amountStr = prompt(
      `Điều chỉnh số dư cho [${user.email || user.id}]\nSố dư hiện tại: ${Number(user.balance || 0).toLocaleString()}đ\n\nNhập số tiền muốn thay đổi (Số dương để cộng, số âm để trừ):`,
      '10000'
    );
    if (!amountStr) return;
    const adjustAmount = parseInt(amountStr, 10);
    if (isNaN(adjustAmount)) return alert('Số tiền không hợp lệ!');

    const updatedBalance = Math.max(0, Number(user.balance || 0) + adjustAmount);
    const { error } = await supabase.from('profiles').update({ balance: updatedBalance }).eq('id', user.id);

    if (error) alert('Lỗi cập nhật: ' + error.message);
    else {
      alert(`Đã cập nhật số dư mới: ${updatedBalance.toLocaleString()}đ`);
      fetchAllData();
    }
  };

  // ================= THAO TÁC DUYỆT ĐƠN HÀNG HOÀN TIỀN =================
  const handleUpdateOrderStatus = async (order, newStatus) => {
    if (order.status === newStatus) return;

    // Cập nhật trạng thái đơn
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
    if (error) return alert('Lỗi: ' + error.message);

    // Nếu duyệt Đơn Thành Công (approved) lần đầu -> Tự động cộng tiền hoàn vào ví
    if (newStatus === 'approved' && order.status !== 'approved' && order.user_id) {
      const targetUser = users.find((u) => u.id === order.user_id);
      const newBalance = Number(targetUser?.balance || 0) + Number(order.cashback_amount);
      await supabase.from('profiles').update({ balance: newBalance }).eq('id', order.user_id);
      alert(`Đã duyệt đơn và cộng ${Number(order.cashback_amount).toLocaleString()}đ vào ví khách!`);
    } else {
      alert('Đã cập nhật trạng thái đơn hàng!');
    }

    fetchAllData();
  };

  // Thống kê nhanh
  const totalPendingWithdrawal = withdrawals
    .filter((w) => w.status === 'pending')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const filteredUsers = users.filter((u) =>
    (u.email || '').toLowerCase().includes(searchUser.toLowerCase())
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
        {/* 4 Khối thống kê tổng quan */}
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
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'overview'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            📊 Tổng Quan & Voucher
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition relative shrink-0 ${
              activeTab === 'withdrawals'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            💸 Quản Lý Rút Tiền
            {withdrawals.filter((w) => w.status === 'pending').length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-amber-400 text-slate-900 rounded-full font-black">
                {withdrawals.filter((w) => w.status === 'pending').length}
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
            📦 Quản Lý Đơn Hoàn Tiền ({orders.length})
          </button>
        </div>

        {/* NỘI DUNG THEO TỪNG TAB */}

        {/* TAB 1: TỔNG QUAN & VOUCHER */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form thêm voucher */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                ➕ Thêm Mã Giảm Giá Mới
              </h2>
              <form onSubmit={handleAddVoucher} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Sàn thương mại</label>
                  <select
                    value={newVoucher.platform}
                    onChange={(e) => setNewVoucher({ ...newVoucher, platform: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="Shopee">Shopee</option>
                    <option value="Lazada">Lazada</option>
                    <option value="TikTok">TikTok Shop</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Mã Voucher (Code)</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: FREESHIP50K"
                    value={newVoucher.code}
                    onChange={(e) => setNewVoucher({ ...newVoucher, code: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Mô tả ưu đãi</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Giảm 50K cho đơn từ 200K"
                    value={newVoucher.description}
                    onChange={(e) => setNewVoucher({ ...newVoucher, description: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Tag / Loại mã</label>
                  <input
                    type="text"
                    value={newVoucher.tag}
                    onChange={(e) => setNewVoucher({ ...newVoucher, tag: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl transition"
                >
                  Đăng Mã Lên Web
                </button>
              </form>
            </div>

            {/* Danh sách voucher đang có */}
            <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                🏷️ Danh Sách Mã Đang Hiển Thị ({vouchers.length})
              </h2>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {vouchers.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">Chưa có mã voucher nào.</p>
                ) : (
                  vouchers.map((v) => (
                    <div
                      key={v.id}
                      className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {v.platform}
                        </span>
                        <div className="truncate">
                          <span className="font-mono font-bold text-rose-400 text-xs mr-2">{v.code}</span>
                          <span className="text-xs text-slate-300">{v.description}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteVoucher(v.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 transition shrink-0"
                      >
                        Xóa
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUẢN LÝ DUYỆT RÚT TIỀN */}
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
                      <tr key={w.id} className="hover:bg-slate-700/20">
                        <td className="py-3 px-4 font-mono font-bold text-slate-300">#{w.id.slice(0, 8)}</td>
                        <td className="py-3 px-4 font-semibold text-white">{w.profiles?.email || w.user_id}</td>
                        <td className="py-3 px-4 font-bold text-rose-400 text-sm">
                          {Number(w.amount).toLocaleString()}đ
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <div>
                            <span className="font-bold text-white">{w.bank_name}</span> - {w.bank_account}
                          </div>
                          {w.account_holder && (
                            <div className="text-[11px] text-slate-400 uppercase">Chủ TK: {w.account_holder}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(w.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {w.status === 'completed' && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                              Đã chuyển khoản
                            </span>
                          )}
                          {w.status === 'pending' && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold animate-pulse">
                              Chờ xử lý
                            </span>
                          )}
                          {w.status === 'rejected' && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                              Đã từ chối
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {w.status === 'pending' ? (
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
        )}

        {/* TAB 3: QUẢN LÝ THÀNH VIÊN */}
        {activeTab === 'users' && (
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-base font-bold text-white">Danh Sách Thành Viên ({users.length})</h2>
              <input
                type="text"
                placeholder="Tìm thành viên theo email..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full sm:w-64 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-rose-500"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 uppercase text-[11px]">
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Số Dư Ví</th>
                    <th className="py-3 px-4">Ngân Hàng Liên Kết</th>
                    <th className="py-3 px-4">Vai Trò</th>
                    <th className="py-3 px-4">Ngày Tham Gia</th>
                    <th className="py-3 px-4 text-right">Điều Chỉnh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-700/20">
                      <td className="py-3 px-4 font-bold text-white">{u.email || u.id}</td>
                      <td className="py-3 px-4 font-black text-emerald-400 text-sm">
                        {Number(u.balance || 0).toLocaleString()}đ
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {u.bank_name ? `${u.bank_name} - ${u.bank_account}` : <span className="text-slate-500">Chưa liên kết</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.role === 'admin'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleAdjustBalance(u)}
                          className="px-3 py-1 text-[11px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition"
                        >
                          +/- Sửa Số Dư
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: QUẢN LÝ ĐƠN HOÀN TIỀN */}
        {activeTab === 'orders' && (
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-bold text-white mb-4">
              Danh Sách Đơn Hàng Hoàn Tiền Toàn Sàn
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 uppercase text-[11px]">
                    <th className="py-3 px-4">Mã Đơn Hàng</th>
                    <th className="py-3 px-4">Sàn</th>
                    <th className="py-3 px-4">Khách Mua</th>
                    <th className="py-3 px-4">Tên Sản Phẩm</th>
                    <th className="py-3 px-4">Giá Trị Đơn</th>
                    <th className="py-3 px-4">Tiền Hoàn (User)</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-500">
                        Chưa có đơn hàng nào phát sinh qua link của bạn.
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-700/20">
                        <td className="py-3 px-4 font-mono font-bold text-slate-200">{ord.order_code}</td>
                        <td className="py-3 px-4 font-bold text-rose-400">{ord.platform}</td>
                        <td className="py-3 px-4 text-slate-300">{ord.profiles?.email || 'Khách vãng lai'}</td>
                        <td className="py-3 px-4 text-slate-300 max-w-[200px] truncate">{ord.product_name || 'N/A'}</td>
                        <td className="py-3 px-4 font-bold text-white">
                          {Number(ord.order_value || 0).toLocaleString()}đ
                        </td>
                        <td className="py-3 px-4 font-black text-emerald-400">
                          +{Number(ord.cashback_amount || 0).toLocaleString()}đ
                        </td>
                        <td className="py-3 px-4 text-center">
                          {ord.status === 'approved' && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                              Đã duyệt
                            </span>
                          )}
                          {ord.status === 'pending' && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                              Chờ duyệt
                            </span>
                          )}
                          {ord.status === 'rejected' && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                              Đã hủy
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {ord.status !== 'approved' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(ord, 'approved')}
                              className="px-2 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded mr-1.5 transition"
                            >
                              Duyệt Đơn
                            </button>
                          )}
                          {ord.status !== 'rejected' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(ord, 'rejected')}
                              className="px-2 py-1 text-[10px] font-bold bg-rose-600/80 hover:bg-rose-600 text-white rounded transition"
                            >
                              Hủy Đơn
                            </button>
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
      </main>
    </div>
  );
}