export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_SORT_COLUMNS = new Set([
  'delivery_date', 'no_gudang' , 'sj_number', 'so_number', 'pelanggan', 'kepada',
  'ukuran', 'total_pcs', 'palet', 'total_m3', 'return_pcs', 'supir', 'plat_mobil'
]);

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
    const filterSO = searchParams.get('so')?.trim() ?? '';
    const filterAction = searchParams.get('action') ?? 'all'; // all | done | final
    const sortByRaw = searchParams.get('sortBy') ?? 'delivery_date';
    const sortBy = ALLOWED_SORT_COLUMNS.has(sortByRaw) ? sortByRaw : 'delivery_date';
    const ascending = searchParams.get('sortDir') === 'asc';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('v_deliveries_processed_list')
      .select('*', { count: 'exact' });

    if (search) {
      const kw = `%${search}%`;
      query = query.or(
        `sj_number.ilike.${kw},pelanggan.ilike.${kw},kepada.ilike.${kw},supir.ilike.${kw},plat_mobil.ilike.${kw}`
      );
    }

    if (filterSO) {
      query = query.ilike('so_number', `%${filterSO}%`);
    }

    if (filterAction === 'done') {
      query = query.eq('final_status', 'draft');
    } else if (filterAction === 'final') {
      query = query.eq('final_status', 'final');
    }

    query = query
      .order(sortBy, { ascending })
      .order('id', { ascending: true }) // tiebreaker biar pagination stabil
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('GET DELIVERIES PROCESSED ERROR:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });

  } catch (err: any) {
    console.error('GET DELIVERIES PROCESSED ERROR:', err);
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}