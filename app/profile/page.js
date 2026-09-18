'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankInfo, setBankInfo] = useState({ bank: '', number: '', holder: '' });
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return (window.location.href = '/login');

      const { data: pData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(pData);

      const { data: oData } = await supabase.from('orders').select('*').eq('user_id', user.id);
      setOrders(oData || []);
    }
    loadData();
  }, []);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (amount > profile.balance_available || amount < 50000) {
      return alert('Số dư không đủ hoặc số tiền rút tối thiểu là 50.000đ!');
    }

    // 1. Tạo lệnh rút tiền
    await supabase.from('withdrawals').insert({
      user_id: profile.id,
      amount,
      bank_name: bankInfo.bank,
      account_number: bankInfo.number,
      account_holder: bankInfo.holder
    });

    // 2. Trừ trực tiếp số dư khả dụng
    await supabase.from('profiles').update({
      balance_available: profile.balance_available - amount
    }).eq('id', profile.id);

    alert('Gửi yêu cầu rút tiền thành công! Tiền sẽ về tài khoản sau 24-48h.');
    window.location.reload();
  };

  if (!profile) return <div className="p-8 text-center">Đang tải thông tin ví...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold">Ví Hoàn Tiền Của Bạn</h2>

      {/* Thống kê số dư */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
          <p className="text-sm text-yellow-700">Chờ đối soát</p>
          <p className="text-2xl font-bold text-yellow-800">
            {Number(profile.balance_pending).toLocaleString('vi-VN')} đ
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
          <p className="text-sm text-green-700">Có thể rút ngay</p>
          <p className="text-2xl font-bold text-green-800">
            {Number(profile.balance_available).toLocaleString('vi-VN')} đ
          </p>
        </div>
      </div>

      {/* Form Rút tiền */}
      <form onSubmit={handleWithdraw} className="bg-white border rounded-xl p-6 space-y-4 shadow-sm">
        <h3 className="font-bold text-lg">Yêu cầu rút tiền về ngân hàng</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Tên ngân hàng (MB, VCB...)"
            required
            className="border p-2 rounded text-sm"
            onChange={(e) => setBankInfo({ ...bankInfo, bank: e.target.value })}
          />
          <input
            type="text"
            placeholder="Số tài khoản"
            required
            className="border p-2 rounded text-sm"
            onChange={(e) => setBankInfo({ ...bankInfo, number: e.target.value })}
          />
          <input
            type="text"
            placeholder="Tên chủ tài khoản"
            required
            className="border p-2 rounded text-sm"
            onChange={(e) => setBankInfo({ ...bankInfo, holder: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Số tiền cần rút (tối thiểu 50.000đ)"
            required
            className="border p-2 rounded text-sm flex-1"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
          />
          <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded text-sm font-bold hover:bg-red-700">
            Rút tiền
          </button>
        </div>
      </form>

      {/* Lịch sử đơn hàng */}
      <div className="bg-white border rounded-xl p-6">
        <h3 className="font-bold mb-4">Lịch sử đơn hoàn tiền</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-400">
              <th className="pb-2">Mã đơn</th>
              <th className="pb-2">Sàn</th>
              <th className="pb-2">Tiền hoàn</th>
              <th className="pb-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b">
                <td className="py-2">{o.order_sn}</td>
                <td>{o.platform}</td>
                <td className="font-bold text-green-600">{Number(o.cashback_amount).toLocaleString('vi-VN')} đ</td>
                <td>
                  <span className={`px-2 py-0.5 rounded text-xs ${o.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}