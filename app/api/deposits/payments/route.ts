export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await request.json();
    
    const {
      deposit_id,
      amount,
      payment_date = new Date().toISOString().split('T')[0],
      payment_method = 'Transfer',
      reference_number = '',
      notes = '',
    } = body;

    // Validate
    if (!deposit_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid deposit_id or amount' },
        { status: 400 }
      );
    }

    // Check deposit exists and is active
    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .select('id, status')
      .eq('id', deposit_id)
      .single();

    if (depositError || !deposit) {
      return NextResponse.json(
        { error: 'Deposit not found' },
        { status: 404 }
      );
    }

    if (deposit.status !== 'active') {
      return NextResponse.json(
        { error: 'Deposit is not active' },
        { status: 400 }
      );
    }

    // Insert payment
    const { data: payment, error: paymentError } = await supabase
      .from('deposit_payments')
      .insert({
        deposit_id,
        amount,
        payment_date,
        payment_method,
        reference_number,
        notes,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Trigger will auto-update deposit.deposit_amount

    return NextResponse.json(payment);
  } catch (err: any) {
    console.error('ADD DEPOSIT PAYMENT ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}