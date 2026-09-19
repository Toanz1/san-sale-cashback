'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      // Lấy phiên làm việc được Google xác thực trả về
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Lỗi xác thực Google:', error.message);
        router.replace('/login');
        return;
      }

      if (session) {
        // Đã nhận diện được user -> Chuyển về trang chủ
        router.replace('/');
      } else {
        // Trường hợp token dạng Hash (#access_token=...)
        const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (newSession) {
            listener.subscription.unsubscribe();
            router.replace('/');
          }
        });
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-slate-200">
      <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sm font-medium">Đang hoàn tất đăng nhập Google...</p>
    </div>
  );
}