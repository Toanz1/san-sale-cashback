'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const BANK_OPTIONS = [
  'MB Bank (Quân Đội)',
  'Vietcombank',
  'Techcombank',
  'VPBank',
  'ACB',
  'TPBank',
  'BIDV',
  'VietinBank',
  'Ví MoMo',
  'Ví ZaloPay'
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const loadData = async () => {
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

    loadData();
  }, [router]);

  const handleSave = async (e) => {
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
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      alert('Đã lưu thông tin tài khoản thành công!');
    } catch (err) {
      alert('Lỗi: ' + (err.message || 'Không thể lưu dữ liệu'));
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
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-slate-300 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Đang tải thông tin tài khoản...</span>
        </div>
      </div>
    );
  }

  const username = user?.email?.split('@')[0] || 'toanzin00001';
  const balanceNumber = Number(profile?.balance);
  const safeBalance = isNaN(balanceNumber) ? 0 : balanceNumber;
  const avatarChar = username.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans selection:bg-rose-500 selection:text-white pb-16">
      {/* Top Navigation Bar đồng bộ với trang chủ */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0F172A]/80 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
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
          </div>

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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 pt-6">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-lg border border-slate-700 transition"
          >
            ← Quay lại
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-rose-400 hover:text-rose-300 px-3.5 py-1.5 rounded-lg border border-slate-700 transition"
          >
            🏠 Trang chủ
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Card thông tin và Menu */}
          <aside className="lg:col-span-4 space-y-4">
            {/* Thẻ người dùng & số dư */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl overflow-hidden shadow-xl text-center">
              <div className="h-20 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500"></div>
              <div className="px-6 pb-6 pt-0 relative flex flex-col items-center">
                <div className="w-16 h-16 -mt-8 rounded-full border-4 border-[#0F172A] bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center text-xl font-black shadow-lg">
                  {avatarChar}
                </div>
                <h3 className="font-bold text-white text-sm mt-3">{username}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{user?.email}</p>

                {/* Hộp số dư neon */}
                <div className="w-full mt-4 p-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white text-left flex items-center justify-between shadow-lg shadow-rose-600/20">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-90 block">
                      Số dư khả dụng
                    </span>
                    <span className="text-xl font-black tracking-tight">
                      {safeBalance.toLocaleString()} VNĐ
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-xl">
                    💳
                  </div>
                </div>
              </div>
            </div>

            {/* Menu điều hướng */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-2 shadow-xl space-y-1">
              <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-700/60 text-rose-400 font-bold text-xs text-left border border-slate-600/50">
                <span>👤</span> Thông tin tài khoản
              </button>
              <Link
                href="/orders"
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-700/40 text-slate-300 hover:text-white font-medium text-xs text-left transition"
              >
                <span>🛍️</span> Đơn hàng
              </Link>
              <Link
                href="/profile"
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-700/40 text-slate-300 hover:text-white font-medium text-xs text-left transition"
              >
                <span>📜</span> Lịch sử rút tiền
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 font-medium text-xs text-left transition border-t border-slate-700/50 mt-2"
              >
                <span>🚪</span> Đăng xuất
              </button>
            </div>
          </aside>

          {/* Cột phải: Form thông tin cá nhân Dark Mode */}
          <section className="lg:col-span-8">
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Thông tin cá nhân</h2>
                <p className="text-xs text-rose-400 font-medium mt-1">
                  Điền thông tin đầy đủ và chính xác để nhận tiền
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Họ và tên viết hoa không dấu
                    </label>
                    <input
                      type="text"
                      placeholder="NGUYEN VAN A"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value.toUpperCase())}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      placeholder="Nhập số điện thoại"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Chọn ngân hàng
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-rose-500 transition"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">- - Chọn ngân hàng - -</option>
                    {BANK_OPTIONS.map((item) => (
                      <option key={item} value={item} className="bg-slate-900 text-white">
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Số tài khoản ngân hàng
                    </label>
                    <input
                      type="text"
                      placeholder="Nhập số tài khoản"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Email
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user?.email || ''}
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-400 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Mật khẩu xác nhận (khi đổi thông tin)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500 transition"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Bắt buộc nếu bạn thay đổi họ tên, số điện thoại, số tài khoản hoặc ngân hàng.
                  </span>
                </div>

                {/* Notice Box Dark Mode */}
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    i
                  </span>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    Tài khoản có số dư trên <strong className="text-rose-400 font-bold">10K</strong> sẽ được tự động thanh toán vào ngày 17 và 27 hàng tháng.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-rose-600/30 transition text-xs flex items-center justify-center gap-1.5"
                  >
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi 💾'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Bạn có chắc chắn muốn yêu cầu khóa/đóng tài khoản?')) {
                        alert('Yêu cầu đã được gửi tới quản trị viên.');
                      }
                    }}
                    className="w-full bg-slate-900 border border-red-500/30 hover:bg-red-500/10 text-red-400 font-bold py-3 rounded-xl transition text-xs flex items-center justify-center gap-1.5"
                  >
                    🗑️ Đóng tài khoản
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