'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Withdrawal {
  id: string;
  so_tien: number;
  ngan_hang: string;
  so_tai_khoan: string;
  ten_chu_tai_khoan: string;
  trang_thai: string;
  created_at: string;
}

export default function WalletPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  // Form states
  const [amount, setAmount] = useState<string>('');
  const [bankName, setBankName] = useState<string>('MB Bank');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const MIN_WITHDRAW = 50000; // Hạn mức rút tối thiểu: 50.000đ

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      // 1. Tính số dư khả dụng từ các đơn APPROVED
      const { data: orders } = await supabase
        .from('orders')
        .select('hoa_hong_tra_khach')
        .eq('trang_thai', 'APPROVED');

      // 2. Tính tổng tiền đã rút hoặc đang yêu cầu rút
      const { data: withdrawData } = await supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      const totalEarned = (orders || []).reduce((sum, o) => sum + Number(o.hoa_hong_tra_khach || 0), 0);
      const totalWithdrawn = (withdrawData || [])
        .filter((w) => w.trang_thai !== 'REJECTED')
        .reduce((sum, w) => sum + Number(w.so_tien || 0), 0);

      // Số dư có thể rút = Tiền được duyệt - Tiền đã rút/đang chờ rút
      setAvailableBalance(Math.max(0, totalEarned - totalWithdrawn));
      setWithdrawals((withdrawData as Withdrawal[]) || []);
    }
    setLoading(false);
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const withdrawAmount = Number(amount);

    if (withdrawAmount < MIN_WITHDRAW) {
      setMessage({ type: 'error', text: `Hạn mức rút tối thiểu là ${MIN_WITHDRAW.toLocaleString('vi-VN')} đ` });
      return;
    }

    if (withdrawAmount > availableBalance) {
      setMessage({ type: 'error', text: 'Số dư khả dụng không đủ để thực hiện yêu cầu!' });
      return;
    }

    if (!accountNumber || !accountName) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin tài khoản nhận tiền!' });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('withdrawals').insert({
      user_id: user.id,
      so_tien: withdrawAmount,
      ngan_hang: bankName,
      so_tai_khoan: accountNumber.trim(),
      ten_chu_tai_khoan: accountName.trim().toUpperCase(),
      trang_thai: 'PENDING'
    });

    setSubmitting(false);

    if (error) {
      setMessage({ type: 'error', text: 'Lỗi khi gửi yêu cầu: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Tạo yêu cầu rút tiền thành công! Hệ thống sẽ xử lý sớm nhất.' });
      setAmount('');
      setAccountNumber('');
      setAccountName('');
      fetchData(); // Cập nhật lại số dư
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải thông tin ví...</div>;
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">Vui lòng đăng nhập để thực hiện rút tiền.</p>
        <a href="/auth" className="px-4 py-2 bg-blue-600 text-white rounded-lg inline-block">Đăng nhập</a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Thẻ số dư ví */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-md">
        <p className="text-sm font-light text-blue-100">Số dư có thể rút về tài khoản</p>
        <p className="text-3xl font-extrabold mt-1">
          {availableBalance.toLocaleString('vi-VN')} đ
        </p>
        <p className="text-xs text-blue-200 mt-2">
          * Rút tối thiểu: {MIN_WITHDRAW.toLocaleString('vi-VN')} đ. Tiền về tài khoản trong 24h - 48h.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form yêu cầu rút tiền */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Tạo yêu cầu rút tiền</h2>

          {message && (
            <div className={`p-3 rounded-lg text-sm mb-4 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Số tiền muốn rút (VNĐ)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="VD: 50000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Ngân hàng thụ hưởng</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="MB Bank">MB Bank (Quân Đội)</option>
                <option value="Vietcombank">Vietcombank</option>
                <option value="Techcombank">Techcombank</option>
                <option value="VPBank">VPBank</option>
                <option value="ACB">ACB</option>
                <option value="Vietinbank">Vietinbank</option>
                <option value="BIDV">BIDV</option>
                <option value="TPBank">TPBank</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Số tài khoản ngân hàng</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Nhập số tài khoản"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tên chủ tài khoản (viết hoa không dấu)</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="VD: NGUYEN VAN A"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm uppercase"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting || availableBalance < MIN_WITHDRAW}
              className={`w-full py-2.5 rounded-lg text-white font-semibold text-sm transition ${
                submitting || availableBalance < MIN_WITHDRAW
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu rút tiền'}
            </button>
          </form>
        </div>

        {/* Lịch sử yêu cầu rút tiền */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Lịch sử rút tiền</h2>

          {withdrawals.length === 0 ? (
            <p className="text-sm text-gray-400 my-auto text-center">Chưa có giao dịch rút tiền nào.</p>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[350px]">
              {withdrawals.map((w) => (
                <div key={w.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {Number(w.so_tien).toLocaleString('vi-VN')} đ
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {w.ngan_hang} - {w.so_tai_khoan}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(w.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    w.trang_thai === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                    w.trang_thai === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {w.trang_thai === 'COMPLETED' ? 'Thành công' :
                     w.trang_thai === 'REJECTED' ? 'Từ chối' : 'Chờ chuyển'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}