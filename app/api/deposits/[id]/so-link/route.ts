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

    if (insertError) throw insertError;

    // Return fresh deposit detail
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
    
    // ✅ Fix: handle body yang mungkin kosong
    let sales_order_id: string | null = null;
    try {
      const body = await request.json();
      sales_order_id = body.sales_order_id;
    } catch {
      // body kosong atau invalid JSON
    }

    // Fallback: coba dari query param
    if (!sales_order_id) {
      const { searchParams } = new URL(request.url);
      sales_order_id = searchParams.get('sales_order_id');
    }

    if (!sales_order_id) {
      return NextResponse.json({ error: 'sales_order_id required' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('deposit_usages')
      .delete()
      .eq('deposit_id', depositId)
      .eq('sales_order_id', sales_order_id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('UNLINK SO ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}