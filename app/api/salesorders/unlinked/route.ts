export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    if (!customerId) {
      return NextResponse.json({ error: 'customer_id required' }, { status: 400 });
    }

    // Fetch semua SO milik customer ini dulu
    const { data: allSO, error: soError } = await supabase
      .from('sales_orders')
      .select('id, so_number, order_date, ship_to_name, status')
      .eq('customer_id', customerId)
      .not('status', 'eq', 'cancelled')
      .order('order_date', { ascending: false });

    if (soError) {
      console.error('Error fetching SO:', soError);
      return NextResponse.json({ error: soError.message }, { status: 500 });
    }

    if (!allSO || allSO.length === 0) {
      return NextResponse.json([]);
    }

    // Ambil SEMUA sales_order_id yang sudah terpakai di deposit_usages —
    // TANPA filter .in() by soIds. Query ini tidak terikat jumlah SO milik
    // customer manapun, jadi tidak akan pernah kena limit panjang URL,
    // berapa pun banyaknya SO yang dimiliki satu customer.
    const { data: linkedRows, error: linkedError } = await supabase
      .from('deposit_usages')
      .select('sales_order_id')
      .not('sales_order_id', 'is', null);

    if (linkedError) {
      console.error('Error fetching linked SO:', linkedError);
      return NextResponse.json({ error: linkedError.message }, { status: 500 });
    }

    // Filter di aplikasi: buang SO yang sales_order_id-nya sudah ada di deposit_usages
    const usedIdSet = new Set(
      (linkedRows || []).map((u: any) => u.sales_order_id).filter(Boolean)
    );

    const unlinkedSO = allSO.filter((so: any) => !usedIdSet.has(so.id));

    return NextResponse.json(unlinkedSO);

  } catch (err: any) {
    console.error('GET UNLINKED SO ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}