'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      if (isLogin) {
        // Xử lý Đăng nhập
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
        router.push('/');
      } else {
        // Xử lý Đăng ký
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
        alert('Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        {/* Tiêu đề & Logo */}
        <div className="text-center space-y-2">
          <a href="/" className="inline-flex items-center gap-1.5 font-black text-xl text-orange-600 tracking-tight">
            <Sparkles className="text-amber-500" /> SĂN SALE HOÀN TIỀN
          </a>
          <h1 className="text-2xl font-bold text-slate-800">
            {isLogin ? 'Đăng nhập tài khoản' : 'Tạo tài khoản mới'}
          </h1>
          <p className="text-xs text-slate-500">
            {isLogin
              ? 'Đăng nhập để theo dõi đơn và rút tiền về ngân hàng'
              : 'Đăng ký ngay để bắt đầu nhận hoàn tiền lên đến 20%'}
          </p>
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
            {errorMessage}
          </div>
        )}

        {/* Biểu mẫu Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Địa chỉ Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
              <input
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
              <input
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm shadow transition flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? 'Đang xử lý...' : (
              <>
                {isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Chuyển đổi giữa Đăng nhập & Đăng ký */}
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMessage('');
              }}
              className="ml-1.5 text-orange-600 font-bold hover:underline"
            >
              {isLogin ? 'Đăng ký ngay' : 'Đăng nhập ngay'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}