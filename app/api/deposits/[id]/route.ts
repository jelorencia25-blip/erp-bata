export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { id } = await context.params;

    // Get deposit details
    const { data: deposit, error: depositError } = await supabase
      .from('v_deposits_summary')
      .select('*')
      .eq('id', id)
      .single();

    if (depositError) {
      console.error('Deposit error:', depositError);
      throw depositError;
    }

    // Get payment history
    const { data: payments, error: paymentsError } = await supabase
      .from('deposit_payments')
      .select('*')
      .eq('deposit_id', id)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Payments error:', paymentsError);
      throw paymentsError;
    }

    // 🔥 FIX: Get usages (SO dengan/tanpa delivery)
    const { data: usages, error: usagesError } = await supabase
      .from('deposit_usages')
      .select(`
        id,
        do_count,
        amount_used,
        created_at,
        
        sales_orders!inner (
          id,
          so_number,
          order_date,
          ship_to_name,
          status
        ),
        
        delivery_orders (
          id,
          sj_number,
          delivery_date
        )
      `)
      .eq('deposit_id', id)
      .order('created_at', { ascending: false });

    if (usagesError) {
      console.error('Usages error:', usagesError);
      throw usagesError;
    }

    // 🔥 FIX: Transform usages
    const transformedUsages = (usages || []).map((u: any) => ({
      id: u.id,
      do_count: u.do_count,
      amount_used: u.amount_used,
      created_at: u.created_at,
      sj_number: u.delivery_orders?.sj_number || '-',
      delivery_date: u.delivery_orders?.delivery_date || '-',
      sales_order: u.sales_orders,
    }));

    return NextResponse.json({
      deposit,
      payments: payments || [],
      usages: transformedUsages,
    });
  } catch (err: any) {
    console.error('GET DEPOSIT DETAIL ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH & DELETE handlers tetap sama...
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { id } = await context.params;
    const body = await request.json();

    const { error } = await supabase
      .from('deposits')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    const { data: updated, error: fetchError } = await supabase
      .from('v_deposits_summary')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('UPDATE DEPOSIT ERROR:', err);
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
    const { id } = await context.params;

    const { data: usages } = await supabase
      .from('deposit_usages')
      .select('id')
      .eq('deposit_id', id)
      .limit(1);

    if (usages && usages.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete deposit with existing SO usages' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('deposits')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE DEPOSIT ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}