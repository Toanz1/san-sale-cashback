'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('withdrawals'); // 'profile' | 'orders' | 'withdrawals'

  // State thông tin cá nhân & ngân hàng
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('MB Bank (Quân Đội)');
  const [bankAccount, setBankAccount] = useState('');

  // State mật khẩu rút tiền riêng biệt
  const [newWithdrawPin, setNewWithdrawPin] = useState('');

  // State rút tiền & lịch sử
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [withdrawals, setWithdrawals] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);

    // Lấy thông tin profile
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (prof) {
      setProfile(prof);
      setFullName(prof.full_name || '');
      setPhone(prof.phone || '');
      setBankName(prof.bank_name || 'MB Bank (Quân Đội)');
      setBankAccount(prof.bank_account || '');
    }

    fetchWithdrawals(user.id);
    fetchOrders(user.id);
  };

  const fetchWithdrawals = async (uid) => {
    const { data } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (data) setWithdrawals(data);
  };

  const fetchOrders = async (uid) => {
    const { data } = await supabase
      .from('cashback_orders')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  // Lưu thông tin cá nhân & Đặt mật khẩu rút tiền mới
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoadingAction(true);

    const updatePayload = {
      full_name: fullName,
      phone: phone,
      bank_name: bankName,
      bank_account: bankAccount,
    };

    // Nếu người dùng có nhập mật khẩu rút tiền mới thì cập nhật
    if (newWithdrawPin.trim()) {
      updatePayload.withdraw_pin = newWithdrawPin.trim();
    }

    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', user.id);

    setLoadingAction(false);
    if (error) {
      alert('Lỗi cập nhật: ' + error.message);
    } else {
      setProfile(prev => ({ ...prev, ...updatePayload }));
      setNewWithdrawPin('');
      alert('Lưu thông tin thành công!');
    }
  };

  // Gửi lệnh rút tiền kèm kiểm tra mật khẩu rút tiền tự đặt
  const handleRequestWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    const currentBalance = Number(profile?.balance || 0);

    // 1. Kiểm tra tài khoản đã tạo mật khẩu rút tiền chưa
    if (!profile?.withdraw_pin) {
      alert('Bạn chưa thiết lập Mật khẩu rút tiền! Vui lòng sang tab "Thông tin tài khoản" để đặt mật khẩu trước.');
      setActiveTab('profile');
      return;
    }

    // 2. Kiểm tra thông tin ngân hàng
    if (!bankAccount || !fullName) {
      alert('Vui lòng cập nhật đầy đủ Số tài khoản và Họ tên ở tab Thông tin tài khoản trước!');
      setActiveTab('profile');
      return;
    }

    if (amount < 10000) {
      alert('Số tiền rút tối thiểu là 10.000 VNĐ!');
      return;
    }

    if (amount > currentBalance) {
      alert('Số dư khả dụng không đủ!');
      return;
    }

    // 3. So khớp mật khẩu rút tiền đã tự đặt
    if (inputPin.trim() !== String(profile.withdraw_pin).trim()) {
      alert('Mật khẩu rút tiền không đúng! Vui lòng kiểm tra lại.');
      return;
    }

    setLoadingAction(true);

    const { error: withdrawErr } = await supabase.from('withdrawals').insert({
      user_id: user.id,
      amount: amount,
      bank_name: bankName,
      bank_account: bankAccount,
      account_number: bankAccount,
      account_name: fullName,
      account_holder: fullName,
      status: 'pending'
    });

    if (withdrawErr) {
      alert('Lỗi tạo lệnh rút tiền: ' + withdrawErr.message);
      setLoadingAction(false);
      return;
    }

    // Trừ số dư khả dụng
    const newBalance = currentBalance - amount;
    await supabase.from('profiles').update({ balance: newBalance }).eq('id', user.id);

    setProfile(prev => ({ ...prev, balance: newBalance }));
    setWithdrawAmount('');
    setInputPin('');
    setLoadingAction(false);
    alert('Tạo lệnh rút tiền thành công! Vui lòng chờ đối soát thanh toán.');
    fetchWithdrawals(user.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const renderStatusBadge = (status, note) => {
    if (status === 'completed' || status === 'approved' || status === 'success') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Đã thanh toán
        </span>
      );
    }
    if (status === 'rejected' || status === 'cancelled') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20" title={note || ''}>
          Bị từ chối {note ? `(${note})` : ''}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
        Đang xử lý
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0F172A]/80 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center font-black text-xl text-white">
              S
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white">
                SĂN SALE <span className="text-rose-500">HOÀN TIỀN</span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">CASHBACK SÀN TMĐT</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-xs">
              <span className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center font-bold text-[10px] text-white">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
              <span className="text-slate-300 font-medium">{user?.email}</span>
            </div>
            <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-rose-400 transition">
              Thoát
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => router.back()} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition">
            ← Quay lại
          </button>
          <Link href="/" className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition">
            🏠 Trang chủ
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột trái */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 p-6 text-white shadow-xl shadow-rose-950/20 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-900/90 border-2 border-white/20 flex items-center justify-center text-2xl font-black text-white mb-3">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <p className="font-bold text-sm">{fullName || user?.email?.split('@')[0]}</p>
              <p className="text-xs text-rose-100/80 mb-6">{user?.email}</p>

              <div className="bg-slate-900/90 border border-white/10 rounded-xl p-4 flex items-center justify-between text-left">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Số dư khả dụng</p>
                  <p className="text-xl font-black text-rose-400 mt-0.5">
                    {Number(profile?.balance || 0).toLocaleString()} VNĐ
                  </p>
                </div>
                <div className="text-2xl">💳</div>
              </div>
            </div>

            {/* Menu Tabs */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-2 space-y-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition ${
                  activeTab === 'profile'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>👤</span> Thông tin tài khoản
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition ${
                  activeTab === 'orders'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>🛍️</span> Đơn hàng ({orders.length})
              </button>

              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition ${
                  activeTab === 'withdrawals'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>📜</span> Lịch sử rút tiền ({withdrawals.length})
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-400 flex items-center gap-3 transition"
              >
                <span>🚪</span> Đăng xuất
              </button>
            </div>
          </div>

          {/* Cột phải */}
          <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
            {/* TAB 1: THÔNG TIN CÁ NHÂN & CÀI ĐẶT MẬT KHẨU RÚT TIỀN */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Thông tin cá nhân</h2>
                <p className="text-xs text-slate-400 mb-6">Điền thông tin đầy đủ và chính xác để nhận tiền</p>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5">Họ và tên viết hoa không dấu</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="NGUYEN VAN A"
                        className="w-full bg-slate-800/50 border border-slate-700/80 rounded-xl px-4 py-3 text-xs text-white uppercase outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5">Số điện thoại</label>
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder=""
                        className="w-full bg-slate-800/50 border border-slate-700/80 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Chọn ngân hàng</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700/80 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-rose-500"
                    >
                      <option value="MB Bank (Quân Đội)">MB Bank (Quân Đội)</option>
                      <option value="Vietcombank">Vietcombank</option>
                      <option value="Techcombank">Techcombank</option>
                      <option value="ACB">ACB</option>
                      <option value="TPBank">TPBank</option>
                      <option value="VPBank">VPBank</option>
                      <option value="Agribank">Agribank</option>
                      <option value="BIDV">BIDV</option>
                      <option value="Vietinbank">Vietinbank</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5">Số tài khoản ngân hàng</label>
                      <input
                        type="text"
                        required
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        placeholder=""
                        className="w-full bg-slate-800/50 border border-slate-700/80 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5">Email</label>
                      <input
                        type="text"
                        disabled
                        value={user?.email || ''}
                        className="w-full bg-slate-800/20 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* KHỐI ĐẶT MẬT KHẨU RÚT TIỀN TỰ ĐẶT */}
                  <div className="p-4 bg-slate-850 bg-slate-800/30 border border-slate-700/70 rounded-xl space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <span>🔐</span> Mật khẩu rút tiền riêng (Tự đặt)
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Trạng thái: {profile?.withdraw_pin ? <strong className="text-emerald-400">Đã cài đặt</strong> : <strong className="text-rose-400">Chưa đặt</strong>}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Mật khẩu dùng để xác nhận mỗi khi rút tiền (nhập từ 4-6 số hoặc ký tự tùy bạn chọn). Để trống nếu không muốn thay đổi.
                    </p>
                    <input
                      type="password"
                      placeholder={profile?.withdraw_pin ? "Nhập mật khẩu rút tiền mới nếu muốn đổi..." : "Thiết lập mật khẩu rút tiền mới..."}
                      value={newWithdrawPin}
                      onChange={(e) => setNewWithdrawPin(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loadingAction}
                    className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-lg shadow-rose-600/30"
                  >
                    {loadingAction ? 'Đang lưu...' : 'Lưu thay đổi 💾'}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: ĐƠN HÀNG */}
            {activeTab === 'orders' && (
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Danh sách đơn hàng</h2>
                <p className="text-xs text-slate-400 mb-6">Các đơn hàng mua qua link hoàn tiền của bạn</p>

                {orders.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                    <p className="text-xs text-slate-500">Chưa ghi nhận đơn hàng nào.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-3">Mã đơn</th>
                          <th className="pb-3">Hoàn tiền</th>
                          <th className="pb-3">Trạng thái</th>
                          <th className="pb-3">Thời gian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {orders.map((o) => (
                          <tr key={o.id}>
                            <td className="py-3 font-mono">{o.order_id}</td>
                            <td className="py-3 text-emerald-400 font-bold">+{Number(o.cashback_amount).toLocaleString()}đ</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${o.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                {o.status === 'approved' ? 'Đã duyệt' : 'Chờ đối soát'}
                              </span>
                            </td>
                            <td className="py-3 text-slate-500 text-[11px]">{new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: RÚT TIỀN & NHẬP MẬT KHẨU RÚT TIỀN ĐÃ ĐẶT */}
            {activeTab === 'withdrawals' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Rút tiền về tài khoản</h2>
                  <p className="text-xs text-slate-400 mb-4">Số dư tối thiểu để rút là 10.000 VNĐ</p>

                  <form onSubmit={handleRequestWithdraw} className="bg-slate-800/40 p-4 border border-slate-700/60 rounded-xl space-y-4">
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Nhập số tiền muốn rút (VNĐ)</label>
                      <input
                        type="number"
                        required
                        min="10000"
                        step="1000"
                        placeholder="Ví dụ: 50000"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-rose-500"
                      />
                    </div>

                    {/* Ô NHẬP MẬT KHẨU RÚT TIỀN */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-slate-300">
                          Mật khẩu rút tiền <span className="text-rose-400 font-bold">*</span>
                        </label>
                        {!profile?.withdraw_pin && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('profile')}
                            className="text-[11px] text-amber-400 hover:underline"
                          >
                            👉 Bấm vào đây để đặt mật khẩu rút tiền trước
                          </button>
                        )}
                      </div>
                      <input
                        type="password"
                        required
                        placeholder={profile?.withdraw_pin ? "Nhập mật khẩu rút tiền đã đặt của bạn" : "Bạn chưa đặt mật khẩu rút tiền"}
                        value={inputPin}
                        onChange={(e) => setInputPin(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <span>Người nhận: <strong className="text-white">{fullName || 'Chưa cập nhật'}</strong></span>
                      <span>Ngân hàng: <strong className="text-white">{bankName} - {bankAccount || 'Chưa cập nhật'}</strong></span>
                    </div>

                    <button
                      type="submit"
                      disabled={loadingAction}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-emerald-600/20"
                    >
                      {loadingAction ? 'Đang kiểm tra...' : 'Xác nhận & Tạo lệnh rút tiền 💸'}
                    </button>
                  </form>
                </div>

                {/* Danh sách rút tiền */}
                <div>
                  <h3 className="text-sm font-bold text-slate-300 mb-3">Lịch sử các yêu cầu rút tiền</h3>
                  {withdrawals.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                      <p className="text-xs text-slate-500">Bạn chưa tạo yêu cầu rút tiền nào.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="pb-3">Thời gian</th>
                            <th className="pb-3">Số tiền</th>
                            <th className="pb-3">Tài khoản nhận</th>
                            <th className="pb-3 text-center">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {withdrawals.map((w) => (
                            <tr key={w.id} className="hover:bg-slate-800/30">
                              <td className="py-3 text-slate-400 text-[11px] whitespace-nowrap">
                                {new Date(w.created_at).toLocaleString('vi-VN')}
                              </td>
                              <td className="py-3 text-rose-400 font-bold whitespace-nowrap">
                                -{Number(w.amount).toLocaleString()} VNĐ
                              </td>
                              <td className="py-3 text-slate-300">
                                <div>{w.bank_name}</div>
                                <span className="font-mono text-[11px] text-slate-500">{w.bank_account || w.account_number}</span>
                              </td>
                              <td className="py-3 text-center whitespace-nowrap">
                                {renderStatusBadge(w.status, w.note)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}