import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Khởi tạo Supabase bằng Service Role Key để có toàn quyền ghi đè RLS từ server
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();

    // MasOffer thường gửi: order_id, aff_sub1, status, commission, project_name, gmv
    const { order_id, aff_sub1, status, commission, project_name, gmv } = body;

    const userId = aff_sub1;
    if (!userId || userId === 'guest') {
      return NextResponse.json({ message: 'Bỏ qua đơn không có User ID' }, { status: 200 });
    }

    // Tỷ lệ hoàn tiền: 70% hoa hồng nhận được
    const CASHBACK_PERCENT = 0.7;
    const commissionNum = Number(commission) || 0;
    const gmvNum = Number(gmv) || 0;
    const cashbackAmount = Math.round(commissionNum * CASHBACK_PERCENT);
    const orderStatus = (status || 'PENDING').toUpperCase();

    // 1. Kiểm tra đơn hàng đã từng được ghi nhận chưa
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_sn', order_id)
      .maybeSingle();

    if (!existingOrder) {
      // 2. Tạo đơn mới vào bảng orders
      await supabaseAdmin.from('orders').insert({
        user_id: userId,
        order_sn: order_id,
        gmv: gmvNum,
        hoa_hong_nhan: commissionNum,
        hoa_hong_tra_khach: cashbackAmount,
        trang_thai: orderStatus
      });

      // Nếu đơn mới là PENDING, cộng ngay vào balance_pending của profile
      if (orderStatus === 'PENDING') {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('balance_pending')
          .eq('id', userId)
          .single();

        if (profile) {
          await supabaseAdmin.from('profiles').update({
            balance_pending: Number(profile.balance_pending || 0) + cashbackAmount
          }).eq('id', userId);
        }
      }
    } else {
      // 3. Đơn đã có từ trước, xử lý thay đổi trạng thái
      if (orderStatus === 'APPROVED' && existingOrder.trang_thai !== 'APPROVED') {
        // Sàn chốt duyệt: Chuyển tiền từ pending sang available
        await supabaseAdmin
          .from('orders')
          .update({ trang_thai: 'APPROVED', updated_at: new Date().toISOString() })
          .eq('order_sn', order_id);

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('balance_pending, balance_available')
          .eq('id', userId)
          .single();

        if (profile) {
          await supabaseAdmin.from('profiles').update({
            balance_pending: Math.max(0, Number(profile.balance_pending || 0) - Number(existingOrder.hoa_hong_tra_khach)),
            balance_available: Number(profile.balance_available || 0) + Number(existingOrder.hoa_hong_tra_khach)
          }).eq('id', userId);
        }
      } else if (orderStatus === 'REJECTED' && existingOrder.trang_thai === 'PENDING') {
        // Đơn hủy / đổi trả: Trừ khoản tiền pending đã cộng tạm trước đó
        await supabaseAdmin
          .from('orders')
          .update({ trang_thai: 'REJECTED', updated_at: new Date().toISOString() })
          .eq('order_sn', order_id);

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('balance_pending')
          .eq('id', userId)
          .single();

        if (profile) {
          await supabaseAdmin.from('profiles').update({
            balance_pending: Math.max(0, Number(profile.balance_pending || 0) - Number(existingOrder.hoa_hong_tra_khach))
          }).eq('id', userId);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Xử lý đơn thành công' });
  } catch (err) {
    console.error('Lỗi Webhook:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Bổ sung method GET để hỗ trợ các network gửi Postback dạng Query Params
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const payload = {
    order_id: searchParams.get('order_id'),
    aff_sub1: searchParams.get('aff_sub1'),
    status: searchParams.get('status'),
    commission: searchParams.get('commission'),
    gmv: searchParams.get('gmv'),
    project_name: searchParams.get('project_name')
  };

  const fakeReq = { json: async () => payload };
  return POST(fakeReq);
}