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

    // Ambil SO yang belum ada di deposit_usages (belum linked ke deposit manapun)
    const { data: linkedSOIds } = await supabase
      .from('deposit_usages')
      .select('sales_order_id')
      .not('sales_order_id', 'is', null);

    const usedIds = (linkedSOIds || [])
      .map((u: any) => u.sales_order_id)
      .filter(Boolean);

    let query = supabase
      .from('sales_orders')
      .select('id, so_number, order_date, ship_to_name, status')
      .eq('customer_id', customerId)
      .not('status', 'eq', 'cancelled')
      .order('order_date', { ascending: false });

    if (usedIds.length > 0) {
      query = query.not('id', 'in', `(${usedIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('GET UNLINKED SO ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}