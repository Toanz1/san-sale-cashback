'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVouchers() {
      try {
        const { data, error } = await supabase
          .from('vouchers')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setVouchers(data || []);
      } catch (err) {
        console.error('Lỗi tải voucher:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchVouchers();
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredVouchers = vouchers.filter((v) => {
    const matchPlatform = selectedPlatform === 'All' || v.platform === selectedPlatform;
    const matchSearch =
      v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchPlatform && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#0d0f17] text-white p-4 sm:p-8 pb-24">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              🎟️ Kho Mã Giảm Giá Săn Sale
            </h1>
            <p className="text-gray-400 text-xs mt-1">Tổng hợp mã Shopee, Lazada, TikTok Shop cập nhật liên tục mỗi ngày</p>
          </div>
          <Link
            href="/"
            className="text-xs bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl transition border border-gray-700"
          >
            ← Về Trang Chủ
          </Link>
        </div>

        {/* Thanh tìm kiếm & Lọc sàn */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Tìm kiếm theo mã (VD: SHOPEE50K) hoặc tên chương trình..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Shopee', 'Lazada', 'TikTok Shop'].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPlatform(p)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
                  selectedPlatform === p
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {p === 'All' ? 'Tất cả sàn' : p}
              </button>
            ))}
          </div>
        </div>

        {/* Danh sách voucher */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-xs">Đang tải kho mã giảm giá...</div>
        ) : filteredVouchers.length === 0 ? (
          <div className="text-center py-16 bg-gray-900/50 rounded-2xl border border-gray-800">
            <p className="text-gray-400 text-xs mb-2">Không tìm thấy mã giảm giá phù hợp.</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedPlatform('All'); }}
              className="text-amber-400 hover:underline text-xs font-bold"
            >
              Xóa bộ lọc tìm kiếm
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVouchers.map((v) => (
              <div
                key={v.id}
                className="bg-gray-900/70 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between hover:border-gray-700 transition shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {v.platform}
                    </span>
                    <span className="text-[11px] text-gray-400">⏳ Hạn: {v.expire_time || 'Hôm nay'}</span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1">{v.title}</h3>
                  <div className="flex items-center gap-2 my-3 bg-gray-950 border border-gray-800 rounded-xl p-2.5">
                    <span className="font-mono font-black text-amber-400 text-sm tracking-wider flex-1 select-all">
                      {v.code}
                    </span>
                    <button
                      onClick={() => handleCopy(v.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        copiedCode === v.code
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                      }`}
                    >
                      {copiedCode === v.code ? 'Đã chép ✓' : 'Sao chép mã'}
                    </button>
                  </div>
                </div>

                {v.affiliate_link && (
                  <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Link săn sale trực tiếp:</span>
                    <a
                      href={v.affiliate_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline font-bold flex items-center gap-1"
                    >
                      Đi tới sàn ➔
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}