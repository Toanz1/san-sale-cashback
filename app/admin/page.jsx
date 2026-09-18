'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usersCount, setUsersCount] = useState(0);
  const [orders, setOrders] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [newVoucher, setNewVoucher] = useState({
    platform: 'Shopee',
    code: '',
    title: '',
    category: 'Toàn sàn',
    expire_time: '23:59'
  });

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        alert('Bạn không có quyền truy cập trang Quản Trị!');
        router.push('/');
        return;
      }

      setIsAdmin(true);
      fetchAdminStats();
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  const fetchAdminStats = async () => {
    // 1. Đếm tổng số user
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    setUsersCount(count || 0);

    // 2. Lấy danh sách đơn hoàn tiền
    const { data: orderData } = await supabase
      .from('cashback_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setOrders(orderData || []);

    // 3. Lấy danh sách mã giảm giá
    const { data: voucherData } = await supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false });
    setVouchers(voucherData || []);
  };

  const handleAddVoucher = async (e) => {
    e.preventDefault();
    if (!newVoucher.code || !newVoucher.title) return alert('Vui lòng điền đủ thông tin');

    const { error } = await supabase.from('vouchers').insert([newVoucher]);
    if (error) {
      alert('Lỗi thêm voucher: ' + error.message);
    } else {
      alert('Thêm voucher thành công!');
      setNewVoucher({ platform: 'Shopee', code: '', title: '', category: 'Toàn sàn', expire_time: '23:59' });
      fetchAdminStats();
    }
  };

  const handleDeleteVoucher = async (id) => {
    if (!confirm('Xóa mã này?')) return;
    await supabase.from('vouchers').delete().eq('id', id);
    fetchAdminStats();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">
        <p className="animate-pulse text-sm">Đang kiểm tra quyền Admin...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded">ADMIN PANEL</span>
              <h1 className="text-2xl font-black text-white">Bảng Theo Dõi Hệ Thống</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">Giám sát người dùng, đơn hoàn tiền và quản lý mã giảm giá</p>
          </div>
          <Link
            href="/"
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg border border-slate-700 transition"
          >
            ← Về Trang Chủ
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
          <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-xl">
            <p className="text-xs text-slate-400 font-medium uppercase">Tổng thành viên</p>
            <p className="text-3xl font-extrabold text-white mt-1">{usersCount}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-xl">
            <p className="text-xs text-slate-400 font-medium uppercase">Tổng đơn ghi nhận</p>
            <p className="text-3xl font-extrabold text-amber-400 mt-1">{orders.length}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-xl">
            <p className="text-xs text-slate-400 font-medium uppercase">Mã voucher đang chạy</p>
            <p className="text-3xl font-extrabold text-emerald-400 mt-1">{vouchers.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-slate-800/60 border border-slate-700 p-5 rounded-xl">
            <h2 className="text-base font-bold text-white mb-4">➕ Thêm Mã Giảm Giá Mới</h2>
            <form onSubmit={handleAddVoucher} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-slate-400">Sàn thương mại</label>
                <select
                  value={newVoucher.platform}
                  onChange={(e) => setNewVoucher({ ...newVoucher, platform: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1 outline-none"
                >
                  <option value="Shopee">Shopee</option>
                  <option value="Lazada">Lazada</option>
                  <option value="TikTok">TikTok Shop</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">Mã voucher (Code)</label>
                <input
                  type="text"
                  placeholder="VD: SALEKHUNG50K"
                  value={newVoucher.code}
                  onChange={(e) => setNewVoucher({ ...newVoucher, code: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1 outline-none uppercase"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Mô tả ưu đãi</label>
                <input
                  type="text"
                  placeholder="VD: Giảm 50K cho đơn từ 200K"
                  value={newVoucher.title}
                  onChange={(e) => setNewVoucher({ ...newVoucher, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Tag / Loại mã</label>
                <input
                  type="text"
                  placeholder="VD: Toàn sàn, Freeship"
                  value={newVoucher.category}
                  onChange={(e) => setNewVoucher({ ...newVoucher, category: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1 outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-2 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-lg text-sm transition"
              >
                Đăng Mã Lên Web
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700 p-5 rounded-xl">
            <h2 className="text-base font-bold text-white mb-4">📦 Đơn Hàng Hoàn Tiền Gần Đây</h2>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-700 rounded-lg">
                Chưa có đơn hàng nào phát sinh qua link của bạn.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase">
                    <tr>
                      <th className="p-2.5">Mã đơn</th>
                      <th className="p-2.5">Hoa hồng</th>
                      <th className="p-2.5">Hoàn cho khách</th>
                      <th className="p-2.5">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b border-slate-800 hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono text-white">{o.order_id}</td>
                        <td className="p-2.5">{Number(o.commission_amount).toLocaleString()}đ</td>
                        <td className="p-2.5 text-emerald-400 font-bold">{Number(o.cashback_amount).toLocaleString()}đ</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] uppercase font-semibold">
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h2 className="text-base font-bold text-white mt-8 mb-4">🏷️ Danh Sách Mã Đang Hiển Thị</h2>
            <div className="space-y-2">
              {vouchers.map((v) => (
                <div key={v.id} className="flex items-center justify-between bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded mr-2">{v.platform}</span>
                    <b className="font-mono text-rose-400 text-xs">{v.code}</b>
                    <span className="text-xs text-slate-300 ml-2">{v.title}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteVoucher(v.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 bg-slate-800 rounded transition"
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}