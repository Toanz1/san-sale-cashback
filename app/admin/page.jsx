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
  const [products, setProducts] = useState([]);

  // Form voucher
  const [newVoucher, setNewVoucher] = useState({
    platform: 'Shopee',
    code: '',
    title: '',
    category: 'Toàn sàn',
    expire_time: 'Hôm nay',
    affiliate_link: ''
  });

  // Form sản phẩm hot
  const [newProduct, setNewProduct] = useState({
    title: '',
    price: '',
    original_price: '',
    cashback_rate: '5%',
    image_url: '',
    affiliate_link: '',
    platform: 'Shopee'
  });

  const [searchUser, setSearchUser] = useState('');

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsers(usersData || []);

      const { data: withData } = await supabase.from('withdrawals').select('*').order('created_at', { ascending: false });
      setWithdrawals(withData || []);

      const { data: ordData } = await supabase.from('cashback_orders').select('*').order('created_at', { ascending: false });
      setOrders(ordData || []);

      const { data: vouData } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });
      setVouchers(vouData || []);

      const { data: prodData } = await supabase.from('hot_products').select('*').order('created_at', { ascending: false });
      setProducts(prodData || []);
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

  // Thao tác duyệt rút tiền
  const handleApproveWithdrawal = async (withdraw) => {
    if (!confirm(`Xác nhận đã chuyển khoản ${Number(withdraw.amount || 0).toLocaleString()}đ cho khách?`)) return;
    const { error } = await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdraw.id);
    if (error) alert('Lỗi: ' + error.message);
    else { alert('Duyệt thành công!'); fetchAllData(); }
  };

  const handleRejectWithdrawal = async (withdraw) => {
    const reason = prompt('Nhập lý do từ chối (Hoàn tiền lại ví user):', 'Sai thông tin STK');
    if (reason === null) return;
    const { error } = await supabase.from('withdrawals').update({ status: 'rejected', note: reason }).eq('id', withdraw.id);
    if (error) return alert('Lỗi: ' + error.message);

    const { data: currentProfile } = await supabase.from('profiles').select('balance').eq('id', withdraw.user_id).single();
    const newBalance = Number(currentProfile?.balance || 0) + Number(withdraw.amount || 0);
    await supabase.from('profiles').update({ balance: newBalance }).eq('id', withdraw.user_id);
    alert('Đã từ chối và hoàn tiền vào ví!');
    fetchAllData();
  };

  // Quản lý voucher
  const handleAddVoucher = async (e) => {
    e.preventDefault();
    if (!newVoucher.code || !newVoucher.title) return alert('Vui lòng nhập đủ thông tin!');
    const { error } = await supabase.from('vouchers').insert([{
      ...newVoucher,
      code: newVoucher.code.toUpperCase().trim(),
      affiliate_link: newVoucher.affiliate_link.trim() || null
    }]);
    if (error) alert('Lỗi thêm voucher: ' + error.message);
    else {
      alert('Thêm voucher thành công!');
      setNewVoucher({ platform: 'Shopee', code: '', title: '', category: 'Toàn sàn', expire_time: 'Hôm nay', affiliate_link: '' });
      fetchAllData();
    }
  };

  const handleDeleteVoucher = async (id) => {
    if (!confirm('Xác nhận xóa voucher này?')) return;
    await supabase.from('vouchers').delete().eq('id', id);
    fetchAllData();
  };

  // Quản lý sản phẩm Hot
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.title || !newProduct.image_url || !newProduct.affiliate_link) {
      return alert('Vui lòng nhập đầy đủ tên, ảnh và link affiliate!');
    }
    const { error } = await supabase.from('hot_products').insert([{
      title: newProduct.title,
      price: Number(newProduct.price) || 0,
      original_price: Number(newProduct.original_price) || 0,
      cashback_rate: newProduct.cashback_rate,
      image_url: newProduct.image_url.trim(),
      affiliate_link: newProduct.affiliate_link.trim(),
      platform: newProduct.platform
    }]);
    if (error) alert('Lỗi thêm sản phẩm: ' + error.message);
    else {
      alert('Thêm sản phẩm thành công!');
      setNewProduct({
        title: '',
        price: '',
        original_price: '',
        cashback_rate: '5%',
        image_url: '',
        affiliate_link: '',
        platform: 'Shopee'
      });
      fetchAllData();
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Xác nhận xóa sản phẩm này?')) return;
    await supabase.from('hot_products').delete().eq('id', id);
    fetchAllData();
  };

  const getUserEmail = (userId) => {
    const found = users.find((u) => String(u.id) === String(userId));
    return found?.email || String(userId || '').slice(0, 8);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Vừa xong';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 'Vừa xong' : d.toLocaleDateString('vi-VN');
    } catch {
      return 'Vừa xong';
    }
  };

  const totalPendingWithdrawal = withdrawals
    .filter((w) => w?.status === 'pending')
    .reduce((sum, item) => sum + Number(item?.amount || 0), 0);

  const filteredUsers = users.filter((u) =>
    (u.email || '').toLowerCase().includes(searchUser.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans pb-24">
      {/* Header Admin */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0F172A]/90 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-rose-600 text-white font-black text-xs px-2.5 py-1 rounded-md tracking-wider">
              ADMIN PANEL
            </span>
            <h1 className="font-extrabold text-base sm:text-lg text-white">Quản Trị Hệ Thống</h1>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl border border-slate-700 transition"
          >
            ← Về Trang Chủ
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6">
        {/* Thống kê 4 ô */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Thành Viên</span>
            <span className="text-2xl font-black text-white">{users.length}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Đơn Hoàn Tiền</span>
            <span className="text-2xl font-black text-amber-400">{orders.length}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Chờ Rút</span>
            <span className="text-2xl font-black text-rose-400">{totalPendingWithdrawal.toLocaleString()}đ</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sản Phẩm Hot</span>
            <span className="text-2xl font-black text-emerald-400">{products.length}</span>
          </div>
        </div>

        {/* Chuyển TAB */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'withdrawals' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-slate-800/60 text-slate-400'
            }`}
          >
            <span>💸 Rút Tiền</span>
            {withdrawals.filter((w) => w?.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-amber-400 text-slate-900 rounded-full font-black">
                {withdrawals.filter((w) => w?.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'products' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-slate-800/60 text-slate-400'
            }`}
          >
            🔥 Sản Phẩm Bán Chạy ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('vouchers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'vouchers' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-slate-800/60 text-slate-400'
            }`}
          >
            🎟️ Voucher ({vouchers.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'users' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-slate-800/60 text-slate-400'
            }`}
          >
            👥 Thành Viên ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'orders' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-slate-800/60 text-slate-400'
            }`}
          >
            🛍️ Đơn Hoàn Tiền ({orders.length})
          </button>
        </div>

        {/* TAB RÚT TIỀN */}
        {activeTab === 'withdrawals' && (
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-bold text-white mb-4">Yêu Cầu Rút Tiền</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 uppercase text-[11px]">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Số Tiền</th>
                    <th className="py-3 px-4">Ngân Hàng</th>
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-700/20">
                      <td className="py-3 px-4 font-semibold text-white">{getUserEmail(w.user_id)}</td>
                      <td className="py-3 px-4 font-bold text-rose-400">{Number(w.amount || 0).toLocaleString()}đ</td>
                      <td className="py-3 px-4 text-slate-300">{w.bank_name} - {w.bank_account || w.account_number} ({w.account_holder || w.account_name})</td>
                      <td className="py-3 px-4 text-slate-400">{formatDate(w.created_at)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          w.status === 'completed' ? 'text-emerald-400 bg-emerald-500/10' : w.status === 'pending' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'
                        }`}>
                          {w.status === 'completed' ? 'Đã duyệt' : w.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {w.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleApproveWithdrawal(w)} className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded-lg">Duyệt</button>
                            <button onClick={() => handleRejectWithdrawal(w)} className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 text-white rounded-lg">Từ chối</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB SẢN PHẨM BÁN CHẠY (HOT DEALS) */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4">Thêm Sản Phẩm Bán Chạy Shopee / Lazada</h2>
              <form onSubmit={handleAddProduct} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Sàn</label>
                    <select
                      value={newProduct.platform}
                      onChange={(e) => setNewProduct({ ...newProduct, platform: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                    >
                      <option value="Shopee">Shopee</option>
                      <option value="Lazada">Lazada</option>
                      <option value="TikTok">TikTok Shop</option>
                    </select>
                  </div>

                  <div className="lg:col-span-3">
                    <label className="text-[11px] text-slate-400 block mb-1">Tên Sản Phẩm</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Nồi chiên không dầu Lock&Lock 5.2L"
                      value={newProduct.title}
                      onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Giá Khuyến Mãi (VNĐ)</label>
                    <input
                      type="number"
                      placeholder="VD: 890000"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Giá Gốc (nếu có)</label>
                    <input
                      type="number"
                      placeholder="VD: 1500000"
                      value={newProduct.original_price}
                      onChange={(e) => setNewProduct({ ...newProduct, original_price: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">% Hoàn Tiền hiển thị</label>
                    <input
                      type="text"
                      placeholder="VD: Hoàn 7% hoặc Hoàn 50k"
                      value={newProduct.cashback_rate}
                      onChange={(e) => setNewProduct({ ...newProduct, cashback_rate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Link Ảnh Sản Phẩm (URL)</label>
                    <input
                      type="url"
                      required
                      placeholder="https://cf.shopee.vn/file/..."
                      value={newProduct.image_url}
                      onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-end pt-1">
                  <div className="w-full">
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Link Tiếp Thị Liên Kết (Shopee Aff / Accesstrade dẫn thẳng tới sản phẩm)
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://s.shopee.vn/... hoặc https://shorten.asia/..."
                      value={newProduct.affiliate_link}
                      onChange={(e) => setNewProduct({ ...newProduct, affiliate_link: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-rose-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-48 shrink-0 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2 rounded-xl transition shadow-lg shadow-rose-600/30"
                  >
                    + Thêm Sản Phẩm
                  </button>
                </div>
              </form>
            </div>

            {/* Bảng sản phẩm */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4">Danh Sách Sản Phẩm Đang Bán Chạy</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((p) => (
                  <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <div className="w-full h-36 bg-slate-800 rounded-lg overflow-hidden mb-2 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                        <span className="absolute top-1 left-1 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {p.cashback_rate}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white line-clamp-2">{p.title}</p>
                      <p className="text-xs text-rose-400 font-black mt-1">{Number(p.price).toLocaleString()}đ</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <a href={p.affiliate_link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-400 hover:underline">
                        Mở thử link ➔
                      </a>
                      <button onClick={() => handleDeleteProduct(p.id)} className="text-[11px] text-rose-400 hover:text-white bg-rose-500/20 px-2 py-0.5 rounded">
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB VOUCHER */}
        {activeTab === 'vouchers' && (
          <div className="space-y-6">
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4">Thêm Mã Giảm Giá</h2>
              <form onSubmit={handleAddVoucher} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Sàn</label>
                    <select
                      value={newVoucher.platform}
                      onChange={(e) => setNewVoucher({ ...newVoucher, platform: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Tiêu Đề / Giảm Giá</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Giảm 50K đơn từ 250K"
                      value={newVoucher.title}
                      onChange={(e) => setNewVoucher({ ...newVoucher, title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Hạn Dùng</label>
                    <input
                      type="text"
                      placeholder="VD: Hôm nay"
                      value={newVoucher.expire_time}
                      onChange={(e) => setNewVoucher({ ...newVoucher, expire_time: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-end pt-1">
                  <div className="w-full">
                    <label className="text-[11px] text-slate-400 block mb-1">Link Affiliate Voucher</label>
                    <input
                      type="url"
                      placeholder="https://s.shopee.vn/... hoặc https://shorten.asia/..."
                      value={newVoucher.affiliate_link}
                      onChange={(e) => setNewVoucher({ ...newVoucher, affiliate_link: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                  <button type="submit" className="w-full sm:w-48 shrink-0 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2 rounded-xl">
                    + Thêm Voucher
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4">Danh Sách Voucher</h2>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Sàn</th>
                    <th className="py-2.5 px-3">Mã</th>
                    <th className="py-2.5 px-3">Nội Dung</th>
                    <th className="py-2.5 px-3">Link Tiếp Thị</th>
                    <th className="py-2.5 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {vouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-700/20">
                      <td className="py-2.5 px-3">{v.platform}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-400">{v.code}</td>
                      <td className="py-2.5 px-3 text-white">{v.title}</td>
                      <td className="py-2.5 px-3 font-mono text-emerald-400 truncate max-w-[150px]">{v.affiliate_link || 'Chưa gắn'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button onClick={() => handleDeleteVoucher(v.id)} className="px-2 py-0.5 text-[11px] bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded">
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB THÀNH VIÊN */}
        {activeTab === 'users' && (
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-bold text-white mb-4">Danh Sách Thành Viên</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Số Dư</th>
                    <th className="py-2.5 px-3">Ngân Hàng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-700/20">
                      <td className="py-2.5 px-3 text-white font-semibold">{u.email}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">{Number(u.balance || 0).toLocaleString()}đ</td>
                      <td className="py-2.5 px-3 text-slate-300">{u.bank_name ? `${u.bank_name} - ${u.bank_account}` : 'Chưa liên kết'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB ĐƠN HÀNG */}
        {activeTab === 'orders' && (
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-bold text-white mb-4">Đơn Hàng Ghi Nhận</h2>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Mã Đơn</th>
                  <th className="py-2.5 px-3">Sàn</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Tiền Hoàn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-700/20">
                    <td className="py-2.5 px-3 font-mono text-white">{o.order_id}</td>
                    <td className="py-2.5 px-3">{o.platform}</td>
                    <td className="py-2.5 px-3 text-slate-300">{getUserEmail(o.user_id)}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{Number(o.cashback_amount || 0).toLocaleString()}đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}