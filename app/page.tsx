'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [loading, setLoading] = useState(false);

  // Danh sách voucher, đơn hoàn tiền, lịch sử rút
  const [vouchers, setVouchers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [withdraws, setWithdraws] = useState([]);

  // Form rút tiền
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    // 1. Tải danh sách voucher săn sale công khai
    const fetchVouchers = async () => {
      const { data } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });
      if (data) setVouchers(data);
    };
    fetchVouchers();

    // 2. Kiểm tra thông tin đăng nhập của người dùng
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchUserData(user.id);
      }
    };
    checkUser();
  }, []);

  const fetchUserData = async (uid) => {
    // Lấy thông tin ví
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (prof) setProfile(prof);

    // Lấy danh sách đơn hoàn tiền
    const { data: ords } = await supabase
      .from('cashback_orders')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (ords) setOrders(ords);

    // Lấy lịch sử yêu cầu rút tiền
    const { data: wds } = await supabase
      .from('withdraw_requests')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (wds) setWithdraws(wds);
  };

  const handleAuth = async (isSignUp) => {
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert('Đăng ký thành công! Hãy kiểm tra hòm thư xác nhận.');
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else {
        setUser(data.user);
        fetchUserData(data.user.id);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setOrders([]);
    setWithdraws([]);
  };

  const handleConvert = async () => {
    if (!inputUrl) return alert('Vui lòng dán link sản phẩm!');
    setLoading(true);

    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalUrl: inputUrl,
          userId: user ? user.id : 'guest'
        })
      });
      const data = await res.json();
      setAffiliateLink(data.affiliateUrl);
    } catch (e) {
      alert('Có lỗi xảy ra khi tạo link!');
    }
    setLoading(false);
  };

  const handleWithdrawRequest = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    const currentBalance = Number(profile?.balance || 0);

    if (amount < 50000) return alert('Số tiền rút tối thiểu là 50.000đ!');
    if (amount > currentBalance) return alert('Số dư hiện tại không đủ để rút!');
    if (!bankName || !accountNumber || !accountHolder) return alert('Vui lòng nhập đầy đủ thông tin tài khoản!');

    setIsWithdrawing(true);
    try {
      const { error } = await supabase.from('withdraw_requests').insert({
        user_id: user.id,
        amount: amount,
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder,
        status: 'pending'
      });

      if (error) throw error;

      alert('Đã gửi yêu cầu rút tiền thành công!');
      setWithdrawAmount('');
      fetchUserData(user.id);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
    setIsWithdrawing(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-3xl flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div>
          <h1 className="text-xl font-bold text-red-600">Săn Sale Hoàn Tiền</h1>
          <p className="text-[11px] text-slate-400">Mua sắm Shopee & Lazada có hoàn tiền</p>
        </div>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Số dư: <b className="text-green-600">{Number(profile?.balance || 0).toLocaleString()}đ</b></span>
            <button onClick={handleLogout} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg">Đăng xuất</button>
          </div>
        ) : (
          <span className="text-xs text-slate-500">Khách vãng lai</span>
        )}
      </div>

      {/* Đăng nhập / Đăng ký nếu chưa login */}
      {!user && (
        <div className="w-full max-w-3xl bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <h2 className="font-semibold mb-1 text-slate-800">Đăng nhập tài khoản</h2>
          <p className="text-xs text-slate-500 mb-4">Đăng ký thành viên để lưu ví và nhận tiền hoàn tự động vào tài khoản.</p>
          <div className="flex flex-col gap-3">
            <input 
              type="email" 
              placeholder="Email của bạn" 
              className="border p-2.5 rounded-lg text-sm outline-none focus:border-red-500"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Mật khẩu" 
              className="border p-2.5 rounded-lg text-sm outline-none focus:border-red-500"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={() => handleAuth(false)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition">Đăng nhập</button>
              <button onClick={() => handleAuth(true)} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg text-sm font-medium transition">Đăng ký</button>
            </div>
          </div>
        </div>
      )}

      {/* Box Tạo Link Hoàn Tiền */}
      <div className="w-full max-w-3xl bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <h2 className="text-lg font-bold mb-1">Dán Link Sản Phẩm Nhận Hoàn Tiền</h2>
        <p className="text-xs text-slate-500 mb-4">Copy link bất kỳ từ Shopee hoặc Lazada rồi dán vào đây để nhận hoàn tiền.</p>
        
        <div className="flex flex-col gap-3">
          <input 
            type="text" 
            placeholder="Dán link sản phẩm Shopee/Lazada vào đây..." 
            className="w-full border p-3 rounded-lg text-sm outline-none focus:border-red-500"
            value={inputUrl} onChange={(e) => setInputUrl(e.target.value)}
          />
          <button 
            onClick={handleConvert}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg text-sm transition"
          >
            {loading ? 'Đang tạo link...' : 'Lấy Link Mua Có Hoàn Tiền'}
          </button>
        </div>

        {affiliateLink && (
          <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
            <p className="text-sm text-slate-700 mb-2 font-medium">Link hoàn tiền của bạn đã sẵn sàng:</p>
            <a 
              href={affiliateLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block bg-red-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg shadow hover:bg-red-700"
            >
              Mở Sản Phẩm & Mua Hàng Ngay
            </a>
          </div>
        )}
      </div>

      {/* Danh sách Voucher & Deal Hot */}
      <div className="w-full max-w-3xl bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-800">🔥 Mã Giảm Giá & Voucher Hot Nhất</h2>
          <p className="text-xs text-slate-500">Thu thập mã giảm nhanh, mua sắm siêu tiết kiệm.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vouchers.map((v) => (
            <div key={v.id} className="border border-dashed border-red-300 bg-red-50/40 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-red-100 text-red-600 rounded">
                    {v.platform}
                  </span>
                  <span className="text-[11px] text-slate-500">{v.expires_at}</span>
                </div>
                <h3 className="font-semibold text-sm text-slate-800 mt-1">{v.title}</h3>
                <p className="text-red-600 font-bold text-base mt-0.5">{v.discount}</p>
                <p className="text-xs text-slate-500">{v.min_spend}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-red-100 flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded border text-slate-700">
                  {v.code || 'MÃ TỰ ĐỘNG'}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(v.code || v.affiliate_url);
                    alert('Đã sao chép mã: ' + (v.code || 'Link deal!'));
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition"
                >
                  Sao chép mã
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Khu vực thành viên đã đăng nhập */}
      {user && (
        <div className="w-full max-w-3xl flex flex-col gap-6 mb-10">
          {/* Form Rút Tiền */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-1 text-slate-800">Rút Tiền Về Ngân Hàng</h2>
            <p className="text-xs text-slate-500 mb-4">Hạn mức rút tối thiểu 50.000đ. Tiền hoàn sẽ được duyệt và chuyển thẳng vào tài khoản của bạn.</p>
            
            <form onSubmit={handleWithdrawRequest} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Số tiền muốn rút (VNĐ)</label>
                <input 
                  type="number" 
                  placeholder="Vd: 50000" 
                  required
                  min="50000"
                  className="w-full border p-2.5 rounded-lg text-sm mt-1 outline-none focus:border-red-500"
                  value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Tên ngân hàng</label>
                <input 
                  type="text" 
                  placeholder="Vd: MB Bank, Vietcombank..." 
                  required
                  className="w-full border p-2.5 rounded-lg text-sm mt-1 outline-none focus:border-red-500"
                  value={bankName} onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Số tài khoản</label>
                <input 
                  type="text" 
                  placeholder="Vd: 0123456789" 
                  required
                  className="w-full border p-2.5 rounded-lg text-sm mt-1 outline-none focus:border-red-500"
                  value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Tên chủ tài khoản</label>
                <input 
                  type="text" 
                  placeholder="Vd: NGUYEN VAN A" 
                  required
                  className="w-full border p-2.5 rounded-lg text-sm mt-1 outline-none uppercase focus:border-red-500"
                  value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)}
                />
              </div>

              <div className="md:col-span-2 mt-2">
                <button 
                  type="submit" 
                  disabled={isWithdrawing}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg text-sm transition"
                >
                  {isWithdrawing ? 'Đang gửi yêu cầu...' : 'Gửi Yêu Cầu Rút Tiền'}
                </button>
              </div>
            </form>
          </div>

          {/* Lịch Sử Mua Hàng & Hoàn Tiền */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-3 text-slate-800">Lịch Sử Mua Hàng & Hoàn Tiền</h2>
            {orders.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Bạn chưa có đơn hàng nào được ghi nhận hoàn tiền.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="py-2.5 px-3">Mã đơn</th>
                      <th className="py-2.5 px-3">Tiền hoàn</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-3">Ngày mua</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((ord) => (
                      <tr key={ord.id} className="border-b hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-medium">{ord.order_id}</td>
                        <td className="py-2.5 px-3 font-semibold text-green-600">+{Number(ord.cashback_amount).toLocaleString()}đ</td>
                        <td className="py-2.5 px-3">
                          {ord.status === 'approved' ? (
                            <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">Đã duyệt ví</span>
                          ) : ord.status === 'rejected' ? (
                            <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">Đã hủy</span>
                          ) : (
                            <span className="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">Chờ đối soát</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-400">{new Date(ord.created_at).toLocaleDateString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Lịch Sử Yêu Cầu Rút Tiền */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-base font-bold mb-3 text-slate-800">Lịch Sử Yêu Cầu Rút Tiền</h2>
            {withdraws.length === 0 ? (
              <p className="text-sm text-slate-400 py-3 text-center">Chưa có yêu cầu rút tiền nào.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="py-2 px-3">Số tiền</th>
                      <th className="py-2 px-3">Ngân hàng</th>
                      <th className="py-2 px-3">Trạng thái</th>
                      <th className="py-2 px-3">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdraws.map((w) => (
                      <tr key={w.id} className="border-b">
                        <td className="py-2 px-3 font-semibold text-slate-800">{Number(w.amount).toLocaleString()}đ</td>
                        <td className="py-2 px-3 text-xs">{w.bank_name} - {w.account_number}</td>
                        <td className="py-2 px-3">
                          {w.status === 'completed' ? (
                            <span className="text-xs text-green-600 font-medium">Đã thanh toán</span>
                          ) : (
                            <span className="text-xs text-amber-600 font-medium">Đang chờ duyệt</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs text-slate-400">{new Date(w.created_at).toLocaleDateString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}