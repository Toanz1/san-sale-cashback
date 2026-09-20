'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// Hàm chuyển đổi tất cả thông báo lỗi sang tiếng Việt
function getVietnameseErrorMessage(error: any): string {
  const msg = error?.message || '';

  if (msg.includes('User already registered')) {
    return 'Email này đã được đăng ký tài khoản. Vui lòng chuyển sang Đăng nhập!';
  }
  if (msg.includes('Invalid login credentials')) {
    return 'Sai email hoặc mật khẩu. Vui lòng kiểm tra lại!';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Email chưa được kích hoạt. Vui lòng kiểm tra hộp thư để xác thực!';
  }
  if (msg.includes('Password should be at least')) {
    return 'Mật khẩu phải có độ dài tối thiểu 6 ký tự!';
  }
  if (msg.includes('rate limit') || msg.includes('Too many requests')) {
    return 'Bạn thao tác quá nhanh, vui lòng thử lại sau vài giây!';
  }
  if (msg.includes('Network request failed') || msg.includes('Failed to fetch')) {
    return 'Lỗi kết nối mạng, vui lòng kiểm tra đường truyền!';
  }
  if (msg.includes('signup is disabled') || msg.includes('Signups not allowed')) {
    return 'Hệ thống đang tạm khóa đăng ký tài khoản mới!';
  }

  return 'Thao tác không thành công, vui lòng kiểm tra lại thông tin!';
}

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        alert('Đăng nhập thành công!');
        router.push('/');
      }
    } catch (err: any) {
      // Gọi hàm hiển thị tiếng Việt
      alert(getVietnameseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      alert('Đăng nhập bằng Google thất bại, vui lòng thử lại!');
      setGoogleLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center font-black text-lg text-white">
              S
            </div>
            <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              SĂN SALE <span className="text-rose-500">HOÀN TIỀN</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white">
            {isSignUp ? 'Tạo tài khoản mới' : 'Đăng nhập vào hệ thống'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isSignUp ? 'Đăng ký để tích lũy tiền hoàn khi mua sắm' : 'Chào mừng bạn quay trở lại'}
          </p>
        </div>

        {/* Nút Đăng nhập nhanh bằng Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-800 font-semibold py-3 px-4 rounded-xl transition shadow-sm text-sm disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>{googleLoading ? 'Đang kết nối...' : 'Tiếp tục với Google'}</span>
        </button>

        {/* Phân cách HOẶC */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="border-t border-slate-800 w-full"></div>
          <span className="bg-slate-900 px-3 text-[11px] text-slate-500 font-medium uppercase absolute">Hoặc dùng Email</span>
        </div>

        {/* Form Email / Pass */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="tenban@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-rose-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mật khẩu</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-rose-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-lg shadow-rose-600/30 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? 'Đang xử lý...' : (isSignUp ? 'Đăng ký tài khoản' : 'Đăng nhập')}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-slate-400 hover:text-rose-400 transition cursor-pointer"
          >
            {isSignUp ? 'Đã có tài khoản? Bấm để đăng nhập' : 'Chưa có tài khoản? Bấm để đăng ký'}
          </button>
        </div>
      </div>
    </div>
  );
}