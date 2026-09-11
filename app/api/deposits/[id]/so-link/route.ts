export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { id: depositId } = await context.params;
    const body = await request.json();
    const { sales_order_id } = body;

    if (!sales_order_id) {
      return NextResponse.json({ error: 'sales_order_id required' }, { status: 400 });
    }

    // Cek deposit exists & active
    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .select('id, status, do_remaining, customer_id')
      .eq('id', depositId)
      .single();

    if (depositError || !deposit) {
      return NextResponse.json({ error: 'Deposit tidak ditemukan' }, { status: 404 });
    }

    if (deposit.status !== 'active') {
      return NextResponse.json({ error: 'Deposit tidak aktif' }, { status: 400 });
    }

    if (deposit.do_remaining <= 0) {
      return NextResponse.json({ error: 'DO remaining sudah habis' }, { status: 400 });
    }

    // Cek SO tidak sudah ada di deposit_usages manapun
    const { data: existingUsage } = await supabase
      .from('deposit_usages')
      .select('id, deposit_id')
      .eq('sales_order_id', sales_order_id)
      .maybeSingle();

    if (existingUsage) {
      return NextResponse.json(
        { error: 'SO ini sudah terhubung ke deposit lain' },
        { status: 400 }
      );
    }

    // Insert deposit_usage
    const { error: insertError } = await supabase
      .from('deposit_usages')
      .insert({
        deposit_id: depositId,
        sales_order_id: sales_order_id,
        delivery_order_id: null,
        do_count: 1,
        amount_used: 0,
      });

    if (insertError) {
      // Kode 23505 = unique constraint violation di kolom sales_order_id.
      // Terjadi kalau ada insert lain (misal manual dari Supabase table editor)
      // yang nabrak SO yang sama di antara waktu cek existingUsage di atas
      // dan insert ini. Database sendiri yang menolak, bukan cuma validasi kode.
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'SO ini sudah terhubung ke deposit lain' },
          { status: 400 }
        );
      }
      throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('LINK SO ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { id: depositId } = await context.params;

    let sales_order_id: string | null = null;
    try {
      const body = await request.json();
      sales_order_id = body.sales_order_id;
    } catch {
      // body kosong atau invalid JSON
    }

    if (!sales_order_id) {
      const { searchParams } = new URL(request.url);
      sales_order_id = searchParams.get('sales_order_id');
    }

    if (!sales_order_id) {
      return NextResponse.json({ error: 'sales_order_id required' }, { status: 400 });
    }

    // PENTING: hapus SEMUA row deposit_usages untuk SO ini, di deposit manapun
    // ia nyangkut — TIDAK di-filter by depositId. Ini memastikan klik "Hapus"
    // benar-benar melepas SO tersebut secara total (jadi null / bebas dari
    // deposit manapun), bukan cuma dari deposit yang modal-nya lagi kebuka.
    // depositId tetap diambil dari params untuk konsistensi struktur route,
    // tapi sengaja tidak dipakai sebagai filter di query delete ini.
    const { data: deletedRows, error: deleteError } = await supabase
      .from('deposit_usages')
      .delete()
      .eq('sales_order_id', sales_order_id)
      .select('id, deposit_id');

    if (deleteError) throw deleteError;

    console.log(
      `UNLINK SO ${sales_order_id}: removed ${deletedRows?.length ?? 0} row(s) across deposits`,
      deletedRows?.map((r) => r.deposit_id)
    );

    return NextResponse.json({
      success: true,
      removed_count: deletedRows?.length ?? 0,
    });
  } catch (err: any) {
    console.error('UNLINK SO ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}