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

    // ✅ Fetch semua SO milik customer ini dulu
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

    // ✅ Ambil SO IDs milik customer ini saja
    const soIds = allSO.map((so: any) => so.id);

    // ✅ Cek mana yang sudah ada di deposit_usages — filter by soIds yg relevan saja
    const { data: linkedSOIds, error: linkedError } = await supabase
      .from('deposit_usages')
      .select('sales_order_id')
      .not('sales_order_id', 'is', null)
      .in('sales_order_id', soIds); // ✅ hanya cek SO milik customer ini

    if (linkedError) {
      console.error('Error fetching linked SO:', linkedError);
      return NextResponse.json({ error: linkedError.message }, { status: 500 });
    }

    // ✅ Buat Set untuk lookup cepat
    const usedIdSet = new Set(
      (linkedSOIds || []).map((u: any) => u.sales_order_id).filter(Boolean)
    );

    // ✅ Filter di aplikasi, bukan di Supabase query
    const unlinkedSO = allSO.filter((so: any) => !usedIdSet.has(so.id));

    return NextResponse.json(unlinkedSO);

  } catch (err: any) {
    console.error('GET UNLINKED SO ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}