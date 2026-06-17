export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get('pageSize') ?? '100', 10)));
    const search = searchParams.get('search')?.trim() ?? '';
    const soFilter = searchParams.get('so')?.trim() ?? '';
    const dateFrom = searchParams.get('dateFrom') ?? '';
    const dateTo = searchParams.get('dateTo') ?? '';
    const tagih = searchParams.get('tagih') ?? 'all';
    const bayar = searchParams.get('bayar') ?? 'all';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('v_invoices_pending_list').select('*', { count: 'exact' });

    if (search) {
      const kw = `%${search}%`;
      query = query.or(`sj_number.ilike.${kw},customer_name.ilike.${kw},deposit_code.ilike.${kw}`);
    }
    if (soFilter) {
      query = query.ilike('so_number', `%${soFilter}%`);
    }
    if (dateFrom) {
      query = query.gte('delivery_date', dateFrom);
    }
    if (dateTo) {
      // pakai "< hari setelah dateTo" bukan "<= dateTo" — supaya aman dipakai
      // baik delivery_date itu type `date` maupun `timestamp` (gak nebak-nebak tipe lagi)
      const next = new Date(dateTo);
      next.setDate(next.getDate() + 1);
      query = query.lt('delivery_date', next.toISOString().split('T')[0]);
    }
    if (tagih === 'yes') query = query.eq('sudah_tagih', true);
    else if (tagih === 'no') query = query.eq('sudah_tagih', false);
    if (bayar === 'yes') query = query.eq('sudah_bayar', true);
    else if (bayar === 'no') query = query.eq('sudah_bayar', false);

    query = query
      .order('delivery_date', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) {
      console.error('GET INVOICES ERROR:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize });

  } catch (err: any) {
    console.error('GET INVOICES ERROR:', err);
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}