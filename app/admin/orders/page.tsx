'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function AdminOrdersContent() {
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form thêm thủ công 1 đơn
  const [singleOrder, setSingleOrder] = useState({
    order_id: '',
    platform: 'Shopee',
    user_id: '',
    order_value: '',
    cashback_amount: '',
  });

  // Khối đối soát hàng loạt từ Excel/CSV
  const [batchText, setBatchText] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      setUsers(usersData || []);

      const { data: ordersData } = await supabase
        .from('cashback_orders')
        .select('*')
        .order('created_at', { ascending: false });
      setOrders(ordersData || []);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu đơn:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      fetchData();
    };
    checkAuth();
  }, [router]);

  // HÀM CHIA HOA HỒNG CHO NGƯỜI GIỚI THIỆU (10% TIỀN HOÀN ĐƠN)
  const processReferralReward = async (buyerProfile: any, cashbackAmount: number) => {
    try {
      if (!buyerProfile?.referred_by || cashbackAmount <= 0) return 0;

      const referrerCode = String(buyerProfile.referred_by).trim().toUpperCase();

      // Tìm người giới thiệu theo user_code hoặc id
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id, balance, user_code')
        .or(`user_code.eq.${referrerCode},id.eq.${referrerCode}`)
        .maybeSingle();

      if (referrer) {
        const commissionRate = 0.1; // 10% hoa hồng giới thiệu
        const reward = Math.round(cashbackAmount * commissionRate);

        if (reward > 0) {
          const newRefBalance = Number(referrer.balance || 0) + reward;
          await supabase
            .from('profiles')
            .update({ balance: newRefBalance })
            .eq('id', referrer.id);

          return reward;
        }
      }
    } catch (err) {
      console.error('Lỗi chia hoa hồng giới thiệu:', err);
    }
    return 0;
  };

  // Xử lý cộng tiền và lưu 1 đơn lẻ
  const handleAddSingleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleOrder.order_id || !singleOrder.user_id || !singleOrder.cashback_amount) {
      alert('Vui lòng điền đủ Mã đơn, Chọn User và Số tiền hoàn!');
      return;
    }

    setSubmitting(true);
    try {
      const amount = Number(singleOrder.cashback_amount);

      // 1. Thêm bản ghi đơn hàng
      const { error: orderError } = await supabase.from('cashback_orders').insert([
        {
          order_id: singleOrder.order_id.trim(),
          platform: singleOrder.platform,
          user_id: singleOrder.user_id,
          order_value: Number(singleOrder.order_value) || 0,
          cashback_amount: amount,
          status: 'completed',
        },
      ]);

      if (orderError) throw orderError;

      // 2. Lấy số dư hiện tại và cộng tiền vào ví User mua hàng
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, balance, referred_by')
        .eq('id', singleOrder.user_id)
        .single();

      const newBalance = Number(profile?.balance || 0) + amount;
      await supabase.from('profiles').update({ balance: newBalance }).eq('id', singleOrder.user_id);

      // 3. Tự động chia 10% hoa hồng cho người giới thiệu nếu có
      const reward = await processReferralReward(profile, amount);

      let msg = `Đã duyệt đơn và cộng ${amount.toLocaleString()}đ vào ví khách!`;
      if (reward > 0) {
        msg += `\nĐồng thời tự động cộng ${reward.toLocaleString()}đ hoa hồng giới thiệu cho ${profile.referred_by}!`;
      }
      alert(msg);

      setSingleOrder({
        order_id: '',
        platform: 'Shopee',
        user_id: '',
        order_value: '',
        cashback_amount: '',
      });
      fetchData();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý đối soát hàng loạt
  const handleProcessBatch = async () => {
    if (!batchText.trim()) {
      alert('Vui lòng dán dữ liệu copy từ file Excel/Sheets!');
      return;
    }

    setSubmitting(true);
    const lines = batchText.trim().split('\n');
    let successCount = 0;
    let totalCommissionSent = 0;

    for (const line of lines) {
      const parts = line.split(/[\t,]/).map((p) => p.trim());
      if (parts.length >= 3) {
        const orderId = parts[0];
        const userIdentifier = parts[1];
        const cashback = Number(parts[2].replace(/[^\d]/g, ''));

        if (orderId && userIdentifier && !isNaN(cashback) && cashback > 0) {
          try {
            const { data: buyer } = await supabase
              .from('profiles')
              .select('id, balance, referred_by')
              .or(`id.eq.${userIdentifier},user_code.eq.${userIdentifier.toUpperCase()}`)
              .maybeSingle();

            if (buyer) {
              await supabase.from('cashback_orders').insert([
                {
                  order_id: orderId,
                  platform: 'Shopee',
                  user_id: buyer.id,
                  cashback_amount: cashback,
                  status: 'completed',
                },
              ]);

              await supabase
                .from('profiles')
                .update({ balance: Number(buyer.balance || 0) + cashback })
                .eq('id', buyer.id);

              const reward = await processReferralReward(buyer, cashback);
              if (reward > 0) totalCommissionSent += reward;

              successCount++;
            }
          } catch (err) {
            console.error(`Lỗi duyệt dòng: ${line}`, err);
          }
        }
      }
    }

    let summary = `Đã xử lý đối soát và cộng tiền thành công cho ${successCount} đơn hàng!`;
    if (totalCommissionSent > 0) {
      summary += `\nTổng hoa hồng tự động chi trả cho người giới thiệu: ${totalCommissionSent.toLocaleString()}đ`;
    }
    alert(summary);

    setBatchText('');
    setSubmitting(false);
    fetchData();
  };

  const getUserDisplay = (userId: string) => {
    const found = users.find((u) => String(u.id) === String(userId));
    if (!found) return userId;
    const uid = found.user_code || `UID${String(found.id).slice(0, 6).toUpperCase()}`;
    return {
      email: found.email,
      uid: uid,
      referrer: found.referred_by || null,
    };
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0F172A]/90 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-md tracking-wider">
              DUYỆT SHOPEE
            </span>
            <h1 className="font-extrabold text-base sm:text-lg text-white">Đối Soát Đơn & Hoàn Tiền</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 rounded-xl transition"
            >
              ⚙ Về Admin Tổng
            </Link>
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition border border-slate-700"
            >
              ← Trang Chủ
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form thêm 1 đơn lẻ */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white">➕ Duyệt & Cộng Tiền Đơn Lẻ</h2>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
                Tự chia 10% hoa hồng mời
              </span>
            </div>

            <form onSubmit={handleAddSingleOrder} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Mã Đơn Hàng Shopee / MasOffer</label>
                <input
                  type="text"
                  required
                  placeholder="VD: 240920XYZ123"
                  value={singleOrder.order_id}
                  onChange={(e) => setSingleOrder({ ...singleOrder, order_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Sàn TMĐT</label>
                  <select
                    value={singleOrder.platform}
                    onChange={(e) => setSingleOrder({ ...singleOrder, platform: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                  >
                    <option value="Shopee">Shopee</option>
                    <option value="Lazada">Lazada</option>
                    <option value="TikTok">TikTok Shop</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Chọn Thành Viên Nhận Hoàn Tiền</label>
                  <select
                    required
                    value={singleOrder.user_id}
                    onChange={(e) => setSingleOrder({ ...singleOrder, user_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                  >
                    <option value="">-- Chọn User --</option>
                    {users.map((u) => {
                      const code = u.user_code || `UID${String(u.id).slice(0, 6).toUpperCase()}`;
                      return (
                        <option key={u.id} value={u.id}>
                          [{code}] {u.email} (Ví: {Number(u.balance || 0).toLocaleString()}đ)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Giá Trị Đơn Hàng (VNĐ)</label>
                  <input
                    type="number"
                    placeholder="VD: 350000"
                    value={singleOrder.order_value}
                    onChange={(e) => setSingleOrder({ ...singleOrder, order_value: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Tiền Hoàn Cho Khách (VNĐ)</label>
                  <input
                    type="number"
                    required
                    placeholder="VD: 15000"
                    value={singleOrder.cashback_amount}
                    onChange={(e) => setSingleOrder({ ...singleOrder, cashback_amount: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-bold outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {submitting ? 'Đang cộng tiền...' : 'Xác Nhận Duyệt & Cộng Vào Ví'}
              </button>
            </form>
          </div>

          {/* Hàng loạt từ file Excel */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-white mb-2">📋 Đối Soát Hàng Loạt Từ Excel</h2>
              <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                Copy 3 cột từ Excel/Google Sheets theo thứ tự: <br />
                <span className="text-amber-400 font-mono font-bold">Mã Đơn [Tab] User ID / Mã UID [Tab] Tiền Hoàn</span>
              </p>
              <textarea
                rows={6}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={`240920A1\tUIDA1B2C3\t15000\n240920B2\t34eee8e4-f2b4-4c13-864a-530cca6794e6\t25000`}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-amber-500 resize-none"
              />
            </div>
            <button
              onClick={handleProcessBatch}
              disabled={submitting || !batchText.trim()}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 text-xs"
            >
              {submitting ? 'Đang duyệt danh sách...' : '⚡ Xử Lý Đối Soát & Tự Động Cộng Tiền'}
            </button>
          </div>
        </div>

        {/* Bảng danh sách đơn đã hoàn */}
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
          <h2 className="text-base font-bold text-white mb-4">Lịch Sử Đơn Hàng Đã Ghi Nhận ({orders.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 uppercase text-[11px]">
                  <th className="py-3 px-4">Mã Đơn</th>
                  <th className="py-3 px-4">Sàn</th>
                  <th className="py-3 px-4">USER ID</th>
                  <th className="py-3 px-4">Email Khách</th>
                  <th className="py-3 px-4">Người Mời (Ref)</th>
                  <th className="py-3 px-4">Tiền Hoàn</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">Chưa có đơn hàng nào được ghi nhận</td>
                  </tr>
                ) : (
                  orders.map((o) => {
                    const uInfo = getUserDisplay(o.user_id) as any;
                    return (
                      <tr key={o.id} className="hover:bg-slate-700/20">
                        <td className="py-3 px-4 font-mono font-bold text-white">{o.order_id}</td>
                        <td className="py-3 px-4 text-slate-300">{o.platform}</td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">{uInfo.uid || o.user_id}</td>
                        <td className="py-3 px-4 text-slate-300">{uInfo.email || o.user_id}</td>
                        <td className="py-3 px-4">
                          {uInfo.referrer ? (
                            <span className="font-mono text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                              {uInfo.referrer} (+10%)
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Không có</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-400">+{Number(o.cashback_amount || 0).toLocaleString()}đ</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-emerald-400 bg-emerald-500/10">
                            Thành công
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-slate-100">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminOrdersContent />
    </Suspense>
  );
}