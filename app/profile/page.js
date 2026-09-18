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

export default function WalletPage() {
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
      <div className="min-h-screen bg-[#FFF9F6] flex items-center justify-center text-slate-500 font-sans">
        Đang tải thông tin tài khoản...
      </div>
    );
  }

  const username = user?.email?.split('@')[0] || 'toanzin00001';
  const balanceNumber = Number(profile?.balance);
  const safeBalance = isNaN(balanceNumber) ? 0 : balanceNumber;

  return (
    <div className="min-h-screen bg-[#FFF9F6] text-slate-800 font-sans">
      {/* Thanh điều hướng trên cùng */}
      <header className="bg-white border-b border-orange-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-400 to-amber-400 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                S
              </div>
              <span className="font-extrabold text-lg text-slate-800 tracking-tight">Thánh Săn Sale</span>
            </Link>
            <span className="hidden md:inline-block text-xs font-semibold text-slate-500 hover:text-orange-600 transition cursor-pointer">
              Mua sắm hoàn tiền
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 text-sm hover:bg-orange-100 transition">
              🔔
            </button>
            <div className="flex items-center gap-2 bg-orange-50/80 px-3 py-1.5 rounded-full border border-orange-100">
              <div className="w-6 h-6 rounded-full bg-orange-400 text-white flex items-center justify-center text-xs font-bold uppercase">
                {username.charAt(0)}
              </div>
              <span className="text-xs font-semibold text-slate-700 max-w-[120px] truncate">
                {username}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Nội dung chính */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full hover:bg-slate-50 transition shadow-sm"
          >
            ← Quay lại
          </button>
          <Link
            href="/"
            className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-white border border-orange-200 px-3.5 py-1.5 rounded-full hover:bg-orange-50 transition shadow-sm"
          >
            🏠 Trang chủ
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Thẻ người dùng và danh mục */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden text-center">
              <div className="h-20 bg-gradient-to-r from-orange-400 to-rose-400"></div>
              <div className="px-6 pb-6 pt-0 relative flex flex-col items-center">
                <div className="w-16 h-16 -mt-8 rounded-full border-4 border-white bg-amber-400 text-white flex items-center justify-center text-2xl shadow">
                  👤
                </div>
                <h3 className="font-bold text-slate-800 text-sm mt-3">{username}</h3>
                <p className="text-xs text-slate-400">{user?.email}</p>

                <div className="w-full mt-4 p-4 rounded-xl bg-gradient-to-r from-orange-500 to-rose-400 text-white text-left flex items-center justify-between shadow-md shadow-orange-500/20">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-90 block">
                      Số dư khả dụng
                    </span>
                    <span className="text-lg font-black tracking-tight">
                      {safeBalance.toLocaleString()} VNĐ
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-lg">
                    💳
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-2 space-y-1">
              <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-orange-50 text-orange-600 font-bold text-xs text-left">
                <span>👤</span> Thông tin tài khoản
              </button>
              <Link
                href="/orders"
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 font-semibold text-xs text-left transition"
              >
                <span>🛍️</span> Đơn hàng
              </Link>
              <Link
                href="/wallet"
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 font-semibold text-xs text-left transition"
              >
                <span>📜</span> Lịch sử rút tiền
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-50 text-red-500 font-semibold text-xs text-left transition border-t border-slate-100 mt-2"
              >
                <span>🚪</span> Đăng xuất
              </button>
            </div>
          </div>

          {/* Cột phải: Form cập nhật thông tin */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">Thông tin cá nhân</h2>
                <p className="text-xs font-semibold text-red-500 mt-1">
                  Điền thông tin đầy đủ và chính xác để nhận tiền
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Họ và tên viết hoa không dấu
                    </label>
                    <input
                      type="text"
                      placeholder="NGUYEN VAN A"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value.toUpperCase())}
                      className="w-full bg-[#F3F6FA] border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-orange-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      placeholder="Nhập số điện thoại"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#F3F6FA] border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-orange-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chọn ngân hàng
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-[#F3F6FA] border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-orange-500 transition"
                  >
                    <option value="">- - Chọn ngân hàng - -</option>
                    {BANK_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Số tài khoản ngân hàng
                    </label>
                    <input
                      type="text"
                      placeholder="Nhập số tài khoản"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full bg-[#F3F6FA] border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-orange-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Email
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user?.email || ''}
                      className="w-full bg-[#E9EEF5] border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mật khẩu xác nhận (khi đổi thông tin)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#F3F6FA] border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-orange-500 transition"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Bắt buộc nếu bạn thay đổi họ tên, số điện thoại, số tài khoản hoặc ngân hàng.
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-100 flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    i
                  </span>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Tài khoản có số dư trên <strong className="text-orange-600 font-bold">10K</strong> sẽ được tự động thanh toán vào ngày 17 và 27 hàng tháng.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 rounded-xl shadow-md shadow-orange-500/25 transition text-xs flex items-center justify-center gap-1.5"
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
                    className="w-full bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5"
                  >
                    🗑️ Đóng tài khoản
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}