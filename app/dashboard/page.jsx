'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // State cho form rút tiền
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const initData = async () => {
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
        .single();
      if (prof) {
        setProfile(prof);
        setBankName(prof.bank_name || '');
        setBankAccount(prof.bank_account || '');
      }

      // Lấy danh sách đơn hoàn tiền
      const { data: orderList } = await supabase
        .from('cashback_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (orderList) setOrders(orderList);

      setLoading(false);
    };

    initData();
  }, [router]);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    const balance = Number(profile?.balance || 0);

    if (amount < 50000) {
      alert('Số tiền rút tối thiểu là 50.000đ');
      return;
    }
    if (amount > balance) {
      alert('Số dư trong ví không đủ!');
      return;
    }

    setSubmitting(true);
    await supabase.from('profiles').update({
      bank_name: bankName,
      bank_account: bankAccount,
    }).eq('id', user.id);

    alert('Đã gửi yêu cầu rút tiền thành công! Quản trị viên sẽ xử lý trong vòng 24h.');
    setWithdrawAmount('');
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-slate-400 text-sm">
        Đang tải thông tin tài khoản...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header điều hướng */}
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <Link href="/" className="text-sm font-semibold text-rose-500 hover:text-rose-400 transition">
            ← Quay lại Săn Sale
          </Link>
          <span className="text-xs text-slate-400">{user?.email}</span>
        </div>

        {/* Thống kê số dư */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Số dư khả dụng</p>
            <h2 className="text-3xl font-black text-emerald-400 mt-2">
              {Number(profile?.balance || 0).toLocaleString()}đ
            </h2>
            <p className="text-xs text-slate-500 mt-1">Được rút trực tiếp về tài khoản ngân hàng</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Hạn mức rút</p>
            <h2 className="text-3xl font-black text-rose-500 mt-2">50.000đ</h2>
            <p className="text-xs text-slate-500 mt-1">Số tiền tối thiểu cho mỗi lệnh rút</p>
          </div>
        </div>

        {/* Form yêu cầu rút tiền */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-4">Yêu Cầu Rút Tiền</h3>
          <form onSubmit={handleWithdraw} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-300 block mb-1">Tên ngân hàng</label>
              <input
                type="text"
                required
                placeholder="VD: MB Bank, Vietcombank..."
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">Số tài khoản</label>
              <input
                type="text"
                required
                placeholder="Số tài khoản ngân hàng"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">Tên chủ thẻ (Viết hoa không dấu)</label>
              <input
                type="text"
                required
                placeholder="VD: NGUYEN VAN A"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">Số tiền muốn rút (VNĐ)</label>
              <input
                type="number"
                required
                min="50000"
                placeholder="Tối thiểu 50000"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-rose-500"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-sm transition"
              >
                {submitting ? 'Đang gửi yêu cầu...' : 'Tạo Yêu Cầu Rút'}
              </button>
            </div>
          </form>
        </div>

        {/* Lịch sử đơn hàng hoàn tiền */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-4">Lịch Sử Đơn Mua Hoàn Tiền</h3>
          {orders.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">Chưa có đơn hàng nào được ghi nhận qua hệ thống.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3">Mã đơn</th>
                    <th className="pb-3">Tiền hoàn</th>
                    <th className="pb-3">Trạng thái</th>
                    <th className="pb-3">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {orders.map((ord) => (
                    <tr key={ord.id}>
                      <td className="py-3 font-mono">{ord.order_id}</td>
                      <td className="py-3 text-emerald-400 font-semibold">+{Number(ord.cashback_amount || 0).toLocaleString()}đ</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${ord.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {ord.status === 'approved' ? 'Đã duyệt' : 'Chờ đối soát'}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500">{new Date(ord.created_at).toLocaleDateString('vi-VN')}</td>
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