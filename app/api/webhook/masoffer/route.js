import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req) {
  try {
    const body = await req.json();

    // MasOffer sẽ gửi các trường tương ứng qua payload
    const { order_id, aff_sub1, status, commission, project_name } = body;

    // aff_sub1 chính là user_id đã gắn lúc convert link
    const userId = aff_sub1;
    if (!userId || userId === 'guest') {
      return NextResponse.json({ message: 'Không có Sub ID người dùng, bỏ qua' });
    }

    // Tỷ lệ hoàn lại cho khách (ví dụ trích 70% hoa hồng trả khách)
    const CASHBACK_PERCENT = 0.7;
    const cashbackAmount = Math.round(Number(commission) * CASHBACK_PERCENT);

    // Lưu hoặc cập nhật đơn hàng vào bảng orders
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('order_sn', order_id)
      .single();

    if (!existingOrder) {
      // 1. Đơn mới phát sinh: Ghi nhận trạng thái PENDING
      await supabase.from('orders').insert({
        user_id: userId,
        sub_id: aff_sub1,
        order_sn: order_id,
        platform: project_name,
        commission_amount: commission,
        cashback_amount: cashbackAmount,
        status: 'PENDING'
      });

      // Tăng số dư chờ duyệt cho khách
      const { data: profile } = await supabase.from('profiles').select('balance_pending').eq('id', userId).single();
      if (profile) {
        await supabase.from('profiles').update({
          balance_pending: Number(profile.balance_pending) + cashbackAmount
        }).eq('id', userId);
      }
    } else if (status === 'approved' && existingOrder.status !== 'APPROVED') {
      // 2. Đơn hoàn tất (hết hạn đổi trả sàn): Chuyển tiền từ pending -> available
      await supabase.from('orders').update({ status: 'APPROVED' }).eq('order_sn', order_id);

      const { data: profile } = await supabase.from('profiles').select('balance_pending, balance_available').eq('id', userId).single();
      if (profile) {
        await supabase.from('profiles').update({
          balance_pending: Math.max(0, Number(profile.balance_pending) - cashbackAmount),
          balance_available: Number(profile.balance_available) + cashbackAmount
        }).eq('id', userId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}