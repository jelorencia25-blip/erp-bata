export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_SORT_COLUMNS = new Set([
  'delivery_date', 'no_gudang', 'sj_number', 'so_number', 'pelanggan', 'kepada',
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

    // Per-field filters — each is independent (AND), no more single OR-search box
    const filterSJ = searchParams.get('sj')?.trim() ?? '';
    const filterSO = searchParams.get('so')?.trim() ?? '';
    const filterGudang = searchParams.get('gudang')?.trim() ?? '';
    const filterSupplier = searchParams.get('supplier')?.trim() ?? ''; // maps to `pelanggan` column
    const filterKepada = searchParams.get('kepada')?.trim() ?? '';
    const filterSupir = searchParams.get('supir')?.trim() ?? '';
    const filterPlat = searchParams.get('plat')?.trim() ?? '';
    const dateFrom = searchParams.get('dateFrom')?.trim() ?? '';
    const dateTo = searchParams.get('dateTo')?.trim() ?? '';

    const filterAction = searchParams.get('action') ?? 'all'; // all | done | final
    const sortByRaw = searchParams.get('sortBy') ?? 'delivery_date';
    const sortBy = ALLOWED_SORT_COLUMNS.has(sortByRaw) ? sortByRaw : 'delivery_date';
    const ascending = searchParams.get('sortDir') === 'asc';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('v_deliveries_processed_list')
      .select('*', { count: 'exact' });

    if (filterSJ) query = query.ilike('sj_number', `%${filterSJ}%`);
    if (filterSO) query = query.ilike('so_number', `%${filterSO}%`);
    if (filterGudang) query = query.ilike('no_gudang', `%${filterGudang}%`);
    if (filterSupplier) query = query.ilike('pelanggan', `%${filterSupplier}%`);
    if (filterKepada) query = query.ilike('kepada', `%${filterKepada}%`);
    if (filterSupir) query = query.ilike('supir', `%${filterSupir}%`);
    if (filterPlat) query = query.ilike('plat_mobil', `%${filterPlat}%`);

    if (dateFrom) query = query.gte('delivery_date', dateFrom);
    if (dateTo) query = query.lte('delivery_date', dateTo);

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