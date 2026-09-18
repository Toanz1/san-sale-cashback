'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function WalletPage() {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankInfo, setBankInfo] = useState({ bank: '', stk: '', name: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = '/login');

    // Lấy thông tin ví
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(profileData);

    // Lấy danh sách đơn hàng đã phát sinh
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setOrders(ordersData || []);
    setLoading(false);
  }

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!amount || amount < 50000) return alert('Số tiền rút tối thiểu là 50.000đ!');
    if (amount > (profile?.so_du_kha_dung || 0)) return alert('Số dư khả dụng không đủ!');
    if (!bankInfo.bank || !bankInfo.stk || !bankInfo.name) return alert('Vui lòng điền đầy đủ thông tin ngân hàng!');

    // Tạo yêu cầu rút tiền
    const { error } = await supabase.from('withdrawals').insert([
      {
        user_id: profile.id,
        so_tien: amount,
        ngan_hang: bankInfo.bank,
        stk: bankInfo.stk,
        ten_chu_tk: bankInfo.name,
        trang_thai: 'PENDING'
      }
    ]);

    if (!error) {
      // Tạm trừ số dư khả dụng
      await supabase
        .from('profiles')
        .update({ so_du_kha_dung: profile.so_du_kha_dung - amount })
        .eq('id', profile.id);

      alert('Tạo yêu cầu rút tiền thành công! Admin sẽ duyệt và chuyển khoản cho bạn.');
      setWithdrawAmount('');
      loadUserData();
    } else {
      alert('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải dữ liệu ví...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Thẻ hiển thị số dư */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Số dư chờ duyệt</p>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {(profile?.so_du_cho_duyet || 0).toLocaleString('vi-VN')} đ
          </p>
          <p className="text-xs text-slate-400 mt-1">Đơn hàng đang chờ sàn đối soát</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Số dư khả dụng</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {(profile?.so_du_kha_dung || 0).toLocaleString('vi-VN')} đ
          </p>
          <p className="text-xs text-slate-400 mt-1">Đủ điều kiện rút về ngân hàng</p>
        </div>
      </div>

      {/* Form rút tiền */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Yêu cầu rút tiền</h2>
        <form onSubmit={handleWithdraw} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Tên ngân hàng (ví dụ: MB, VCB)"
              value={bankInfo.bank}
              onChange={(e) => setBankInfo({ ...bankInfo, bank: e.target.value })}
              className="p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none"
              required
            />
            <input
              type="text"
              placeholder="Số tài khoản nhận"
              value={bankInfo.stk}
              onChange={(e) => setBankInfo({ ...bankInfo, stk: e.target.value })}
              className="p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none"
              required
            />
            <input
              type="text"
              placeholder="Tên chủ tài khoản"
              value={bankInfo.name}
              onChange={(e) => setBankInfo({ ...bankInfo, name: e.target.value })}
              className="p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none"
              required
            />
          </div>
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Số tiền cần rút (tối thiểu 50.000đ)"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="flex-1 p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none"
              required
            />
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition"
            >
              Gửi yêu cầu rút
            </button>
          </div>
        </form>
      </div>

      {/* Lịch sử đơn hàng */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Lịch sử đơn hoàn tiền</h2>
        {orders.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">Chưa có đơn hàng nào phát sinh.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase border-b">
                <tr>
                  <th className="py-3 px-4">Mã đơn</th>
                  <th className="py-3 px-4">Sàn</th>
                  <th className="py-3 px-4">Tiền hoàn</th>
                  <th className="py-3 px-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono">{order.order_sn}</td>
                    <td className="py-3 px-4">{order.platform || 'Shopee'}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-600">
                      {order.hoa_hong_tra_khach?.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        order.trang_thai === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        order.trang_thai === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {order.trang_thai}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}