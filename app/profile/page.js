'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const BANK_LIST = [
  'MB Bank (Quân Đội)',
  'Vietcombank',
  'Techcombank',
  'VPBank',
  'ACB',
  'TPBank',
  'BIDV',
  'VietinBank',
  'MoMo',
  'ZaloPay'
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setBankName(data.bank_name || '');
        setBankAccount(data.bank_account || '');
      }
      setLoading(false);
    };

    fetchUserData();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          bank_name: bankName,
          bank_account: bankAccount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      alert('Đã cập nhật thông tin nhận tiền thành công!');
    } catch (err: any) {
      alert('Lỗi cập nhật: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-slate-300">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Đang tải thông tin...</span>
        </div>
      </div>
    );
  }

  const displayName = fullName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Thành viên';
  const avatarChar = (displayName[0] || 'U').toUpperCase();

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans selection:bg-rose-500 selection:text-white pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0F172A]/80 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center font-black text-xl shadow-lg shadow-rose-500/20 text-white">
              S
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                SĂN SALE <span className="text-rose-500 font-black">HOÀN TIỀN</span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Cashback Sàn TMĐT</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/70 px-2.5 py-1.5 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {avatarChar}
              </div>
              <span className="text-xs font-semibold text-slate-200 max-w-[120px] sm:max-w-[180px] truncate">
                {user?.email}
              </span>
            </div>

            <button 
              onClick={handleLogout} 
              className="text-xs text-slate-400 hover:text-rose-400 transition px-2 py-1"
            >
              Thoát
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 pt-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            ← Quay lại
          </button>
          <Link 
            href="/" 
            className="flex items-center gap-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            🏠 Trang chủ
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Sidebar Cards */}
          <aside className="lg:col-span-4 flex flex-col gap-4">
            {/* User Profile Summary Card */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl overflow-hidden shadow-xl">
              <div className="h-20 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500"></div>
              <div className="px-6 pb-6 pt-0 relative flex flex-col items-center text-center">
                <div className="w-20 h-20 -mt-10 rounded-full border-4 border-[#0F172A] bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center text-2xl font-black shadow-lg">
                  {avatarChar}
                </div>
                <h3 className="mt-3 text-base font-bold text-white tracking-wide">{displayName}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{user?.email}</p>

                {/* Balance Badge Box */}
                <div className="w-full mt-5 p-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white flex items-center justify-between shadow-lg shadow-rose-600/20">
                  <div>
                    <span className="text-[11px] font-semibold text-rose-100 uppercase tracking-wider block">Số dư khả dụng</span>
                    <span className="text-xl font-extrabold tracking-tight">
                      {Number(profile?.balance || 0).toLocaleString()} VNĐ
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-lg">
                    💳
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Links */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-2 shadow-xl flex flex-col gap-1">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-700/60 text-rose-400 font-semibold text-xs border border-slate-600/50 text-left">
                <span>👤</span> Thông tin tài khoản
              </button>
              <Link href="/orders" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-700/40 text-slate-300 hover:text-white font-medium text-xs transition text-left">
                <span>🛍️</span> Đơn hàng hoàn tiền
              </Link>
              <Link href="/wallet" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-700/40 text-slate-300 hover:text-white font-medium text-xs transition text-left">
                <span>📜</span> Lịch sử rút tiền
              </Link>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 font-medium text-xs transition text-left mt-2 border-t border-slate-700/50">
                <span>🚪</span> Đăng xuất
              </button>
            </div>
          </aside>

          {/* Right Column: Bank & Account Settings Form */}
          <section className="lg:col-span-8">
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Thông tin cá nhân</h2>
                <p className="text-xs text-rose-400 font-medium mt-1">
                  Điền thông tin đầy đủ và chính xác để nhận tiền hoàn về tài khoản
                </p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Họ và tên */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Họ và tên viết hoa không dấu
                    </label>
                    <input
                      type="text"
                      placeholder="NGUYEN VAN A"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value.toUpperCase())}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-rose-500 transition"
                    />
                  </div>

                  {/* Số điện thoại */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      placeholder="0912345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-rose-500 transition"
                    />
                  </div>
                </div>

                {/* Chọn ngân hàng */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Chọn ngân hàng / Ví điện tử
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-rose-500 transition"
                  >
                    <option value="">- - Chọn ngân hàng / ví nhận tiền - -</option>
                    {BANK_LIST.map((b) => (
                      <option key={b} value={b} className="bg-slate-900 text-white">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Số tài khoản */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Số tài khoản ngân hàng / Số ví
                    </label>
                    <input
                      type="text"
                      placeholder="Nhập số tài khoản nhận tiền"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-rose-500 transition"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Email tài khoản
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-400 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                {/* Ghi chú chính sách thanh toán */}
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
                  <span className="text-rose-400 text-lg">ℹ️</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tài khoản có số dư từ <strong className="text-rose-400">10.000 VNĐ</strong> trở lên sẽ được hệ thống đối soát và chuyển khoản tự động vào ngày 17 và 27 hàng tháng.
                  </p>
                </div>

                {/* Nút thao tác */}
                <div className="pt-2 flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-rose-600/30 transition text-sm flex items-center justify-center gap-2"
                  >
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi 💾'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}