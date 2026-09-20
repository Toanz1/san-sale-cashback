'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface WithdrawalItem {
  id: string;
  user_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: 'pending' | 'completed' | 'rejected';
  created_at: string;
}

export default function AdminWithdrawalsPage() {
  const [list, setList] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchWithdrawals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setList(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: 'completed' | 'rejected') => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      await fetchWithdrawals();
    } catch (err: any) {
      alert('Lỗi cập nhật: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f17] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-gray-800">
          <div>
            <h1 className="text-xl font-bold">Danh Sách Yêu Cầu Rút Tiền</h1>
            <p className="text-xs text-gray-400 mt-1">Duyệt lệnh chuyển khoản cho người dùng</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/orders" className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded">
              Duyệt đơn Shopee
            </Link>
            <Link href="/" className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded">
              Về trang chủ
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Đang tải danh sách...</div>
        ) : list.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-900/50 rounded-xl border border-gray-800">
            Chưa có yêu cầu rút tiền nào.
          </div>
        ) : (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-800/60 text-gray-400 text-xs">
                <tr>
                  <th className="px-5 py-3">Thời gian</th>
                  <th className="px-5 py-3">Số tiền</th>
                  <th className="px-5 py-3">Thông tin nhận</th>
                  <th className="px-5 py-3 text-center">Trạng thái</th>
                  <th className="px-5 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {list.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-800/30">
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-5 py-4 font-bold text-emerald-400">
                      {Number(item.amount).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <div className="font-semibold text-gray-200">{item.bank_name}</div>
                      <div className="text-xs text-gray-300">STK: <span className="font-mono text-amber-300 select-all">{item.account_number}</span></div>
                      <div className="text-xs text-gray-400">Tên: {item.account_name}</div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {item.status === 'completed' && <span className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Đã chuyển</span>}
                      {item.status === 'rejected' && <span className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 border border-red-500/30">Đã từ chối</span>}
                      {item.status === 'pending' && <span className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">Chờ duyệt</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {item.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'completed')}
                            disabled={processingId === item.id}
                            className="bg-emerald-600 hover:bg-emerald-500 text-xs px-3 py-1.5 rounded transition disabled:opacity-50"
                          >
                            Đã chuyển
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'rejected')}
                            disabled={processingId === item.id}
                            className="bg-red-600/80 hover:bg-red-600 text-xs px-2.5 py-1.5 rounded transition disabled:opacity-50"
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Hoàn tất</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}