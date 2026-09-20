'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function AdminUploadOrders() {
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResultMsg('Đang đọc dữ liệu từ file...');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(sheet);

      let successCount = 0;

      for (const row of json) {
        // Tìm các cột tương ứng trong file báo cáo Shopee xuất ra
        const orderId = row['Mã đơn hàng'] || row['Order ID'] || row['order_id'];
        const subId = row['Sub ID'] || row['Sub_id 1'] || row['sub_id1'] || row['sub_id'];
        const commission = Number(row['Hoa hồng'] || row['Estimated Commission'] || row['commission'] || 0);

        // Bỏ qua nếu không có sub_id hoặc sub_id là guest
        if (!subId || subId === 'guest' || !orderId || commission <= 0) continue;

        // Hoàn lại 70% hoa hồng cho khách
        const cashback = Math.round(commission * 0.7);

        // 1. Lưu vào bảng orders
        await supabase.from('orders').upsert({
          order_id: String(orderId),
          user_id: String(subId),
          platform: 'Shopee',
          order_value: Number(row['Giá trị đơn hàng'] || row['Total Purchase Amount'] || 0),
          commission: commission,
          cashback_amount: cashback,
          status: 'approved',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'order_id' });

        // 2. Cộng trực tiếp vào số dư ví của khách
        await supabase.rpc('handle_order_cashback', {
          p_user_id: String(subId),
          p_cashback_amount: cashback,
          p_status: 'approved',
        });

        successCount++;
      }

      setResultMsg(`Đã xử lý xong! Cập nhật thành công ${successCount} đơn hàng có Sub ID.`);
    } catch (err: any) {
      setResultMsg(`Lỗi xử lý file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f17] text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-gray-800">
          <h1 className="text-xl font-bold">Duyệt Hoàn Tiền Từ Báo Cáo Shopee</h1>
          <Link href="/" className="text-sm bg-gray-800 px-3 py-1.5 rounded">← Về trang chủ</Link>
        </div>

        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-4">
          <p className="text-sm text-gray-300">
            1. Vào <a href="https://affiliate.shopee.vn" target="_blank" className="text-blue-400 underline">Shopee Affiliate Dashboard</a>.<br />
            2. Tải file <b>Báo cáo chuyển đổi / đơn hàng</b> (.xlsx hoặc .csv).<br />
            3. Tải file lên ô bên dưới để hệ thống tự lọc Sub ID và cộng tiền vào ví người dùng:
          </p>

          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            disabled={loading}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-500 cursor-pointer"
          />

          {loading && <p className="text-yellow-400 text-sm">Đang tính toán và cộng tiền vào ví...</p>}
          {resultMsg && <div className="p-3 bg-gray-800 text-sm rounded border border-gray-700 text-emerald-400">{resultMsg}</div>}
        </div>
      </div>
    </div>
  );
}