'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [platform, setPlatform] = useState('Shopee');
  const [category, setCategory] = useState('Toàn sàn');
  const [expireTime, setExpireTime] = useState('Hôm nay');
  const [affiliateUrl, setAffiliateUrl] = useState('');

  // Data State
  const [vouchers, setVouchers] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Kiểm tra xem phiên làm việc hiện tại đã nhập mật khẩu chưa
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_unlocked') === 'true') {
      setIsPinUnlocked(true);
    }
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Vui lòng đăng nhập tài khoản quản trị!');
      router.push('/login');
      return;
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (prof?.role !== 'admin') {
      alert('Tài khoản này không có quyền truy cập trang Quản Trị!');
      router.push('/');
      return;
    }

    fetchVouchers();
    fetchOrders();
    setLoading(false);
  };

  const handleVerifyPin = (e) => {
    e.preventDefault();
    const correctPin = process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY || '123456';
    if (pinInput === correctPin) {
      setIsPinUnlocked(true);
      sessionStorage.setItem('admin_unlocked', 'true');
      setPinError('');
    } else {
      setPinError('Mật khẩu quản trị không chính xác!');
    }
  };

  const handleLockAdmin = () => {
    sessionStorage.removeItem('admin_unlocked');
    setIsPinUnlocked(false);
    setPinInput('');
  };

  const fetchVouchers = async () => {
    const { data } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });
    if (data) setVouchers(data);
  };

  const fetchOrders = async () => {
    const { data } = await supabase.from('cashback_orders').select('*').order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  const handleAddVoucher = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('vouchers').insert({
      title,
      code,
      platform,
      category,
      expire_time: expireTime,
      affiliate_url: affiliateUrl
    });

    if (error) {
      alert('Lỗi thêm voucher: ' + error.message);
    } else {
      alert('Đã thêm voucher thành công!');
      setTitle('');
      setCode('');
      setAffiliateUrl('');
      fetchVouchers();
    }
  };

  const handleDeleteVoucher = async (id) => {
    if (!confirm('Xác nhận xóa voucher này?')) return;
    await supabase.from('vouchers').delete().eq('id', id);
    fetchVouchers();
  };

  const handleApproveOrder = async (order) => {
    if (!confirm(`Duyệt hoàn tiền cho đơn ${order.order_id}?`)) return;

    await supabase.from('cashback_orders').update({ status: 'approved' }).eq('id', order.id);

    const { data: prof } = await supabase.from('profiles').select('balance').eq('id', order.user_id).single();
    const newBalance = Number(prof?.balance || 0) + Number(order.cashback_amount);
    await supabase.from('profiles').update({ balance: newBalance }).eq('id', order.user_id);

    alert('Đã duyệt và cộng tiền vào ví người dùng!');
    fetchOrders();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-slate-400 flex items-center justify-center text-sm">
        Đang xác thực thông tin tài khoản...
      </div>
    );
  }

  // Giao diện Khóa Bảo Vệ - Yêu cầu nhập Mật Khẩu Quản Trị
  if (!isPinUnlocked) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl text-center">
          <div className="w-12 h-12 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            🔒
          </div>
          <h2 className="text-base font-bold text-white mb-1">Xác Thực Quản Trị Viên</h2>
          <p className="text-xs text-slate-400 mb-5">Nhập mật khẩu cấp 2 để mở khóa bảng điều khiển</p>

          <form onSubmit={handleVerifyPin} className="space-y-3">
            <input
              type="password"
              placeholder="Nhập mật khẩu quản trị..."
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-center text-white tracking-widest outline-none focus:border-rose-500"
              autoFocus
            />
            {pinError && <p className="text-[11px] text-red-400">{pinError}</p>}
            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-lg shadow-rose-600/30"
            >
              Mở Khóa Quản Trị
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-400 transition">
              ← Quay về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Giao diện Quản trị khi đã nhập đúng mật khẩu
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-rose-500">Trang Quản Trị Hệ Thống</h1>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">Đã xác thực</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleLockAdmin}
              className="text-xs text-slate-400 hover:text-rose-400 transition"
            >
              🔒 Khóa trang
            </button>
            <Link href="/" className="text-xs text-slate-400 hover:text-white transition">
              ← Về Trang Chủ
            </Link>
          </div>
        </div>

        {/* Form Thêm Voucher */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-base font-bold text-white mb-4">Thêm Mã Giảm Giá Mới</h2>
          <form onSubmit={handleAddVoucher} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Tiêu đề ưu đãi</label>
              <input
                type="text"
                required
                placeholder="VD: Giảm 50K cho đơn từ 250K"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Mã giảm giá (Code)</label>
              <input
                type="text"
                required
                placeholder="VD: SHOPEE50K"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Sàn thương mại</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
              >
                <option value="Shopee">Shopee</option>
                <option value="Lazada">Lazada</option>
                <option value="TikTok">TikTok Shop</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Loại voucher</label>
              <input
                type="text"
                placeholder="VD: Freeship, Toàn sàn..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Thời hạn</label>
              <input
                type="text"
                placeholder="VD: Hôm nay, Còn 2 ngày..."
                value={expireTime}
                onChange={(e) => setExpireTime(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Link tiếp thị liên kết (Tùy chọn)</label>
              <input
                type="text"
                placeholder="https://..."
                value={affiliateUrl}
                onChange={(e) => setAffiliateUrl(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div className="md:col-span-3">
              <button
                type="submit"
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-6 py-2 rounded-xl text-xs transition"
              >
                + Đăng Voucher Lên Trang Chủ
              </button>
            </div>
          </form>

          {/* Danh sách voucher */}
          <div className="mt-6 border-t border-slate-800 pt-4">
            <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
              Danh Sách Voucher Hiện Có ({vouchers.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vouchers.map((v) => (
                <div key={v.id} className="bg-slate-800/60 p-3 rounded-xl flex justify-between items-center border border-slate-700">
                  <div>
                    <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-medium mr-2">
                      {v.platform}
                    </span>
                    <span className="text-xs font-bold text-white">{v.code}</span>
                    <p className="text-[11px] text-slate-400 mt-1">{v.title}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteVoucher(v.id)}
                    className="text-xs text-red-400 hover:text-red-300 p-2"
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Duyệt đơn hoàn tiền */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h2 className="text-base font-bold text-white mb-4">Duyệt Đơn Hàng Hoàn Tiền</h2>
          {orders.length === 0 ? (
            <p className="text-xs text-slate-500">Chưa có đơn hàng nào cần đối soát.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3">Mã đơn</th>
                    <th className="pb-3">User ID</th>
                    <th className="pb-3">Tiền hoàn</th>
                    <th className="pb-3">Trạng thái</th>
                    <th className="pb-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {orders.map((ord) => (
                    <tr key={ord.id}>
                      <td className="py-3 font-mono">{ord.order_id}</td>
                      <td className="py-3 text-slate-400 font-mono text-[10px]">{ord.user_id?.slice(0, 8)}...</td>
                      <td className="py-3 text-emerald-400 font-bold">
                        +{Number(ord.cashback_amount || 0).toLocaleString()}đ
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            ord.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {ord.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {ord.status !== 'approved' && (
                          <button
                            onClick={() => handleApproveOrder(ord)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-[11px] font-semibold transition"
                          >
                            Duyệt & Cộng Tiền
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}