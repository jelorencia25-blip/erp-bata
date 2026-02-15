export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("delivery_orders")
    .select(`
      id,
      delivery_date,
      sj_number,
      final_status,
      sales_orders!inner (
        so_number,
        ship_to_name,
        delivery_address,
        status,
        customers ( name ),
        sales_order_items (
          total_pcs,
          pallet_qty,
          total_m3,
          products (
            ukuran
          )
        )
      ),
      delivery_return_items ( return_pcs ),
      staff:staff!delivery_orders_driver_id_fkey ( name ),
      vehicles ( plate_number )
    `)
    .not("sj_number", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (data ?? [])
    .filter((d: any) => d.sales_orders?.status !== "cancelled")
    .map((d: any) => {
      const so = d.sales_orders;

      let totalPcs = 0;
      let totalPalet = 0;
      let totalM3 = 0;
      let totalReturn = 0;

      const ukuranSet = new Set<string>();

      // SALES ORDER ITEMS
      for (const item of so?.sales_order_items ?? []) {
        totalPcs += Number(item.total_pcs || 0);
        totalPalet += Number(item.pallet_qty || 0);
        totalM3 += Number(item.total_m3 || 0);

        if (item.products?.ukuran) {
          ukuranSet.add(item.products.ukuran);
        }
      }

      // DELIVERY RETURNS
      for (const r of d.delivery_return_items ?? []) {
        totalReturn += Number(r.return_pcs || 0);
      }

      return {
        id: d.id,
        delivery_date: d.delivery_date,
        final_status: d.final_status,
        sj_number: d.sj_number,
        so_number: so?.so_number ?? "-",
        pelanggan: so?.customers?.name ?? "-",
        kepada: so?.ship_to_name ?? "-",
        alamat: so?.delivery_address ?? "-",
        ukuran: Array.from(ukuranSet).join(", "),
        total_pcs: totalPcs,
        return_pcs: totalReturn,
        palet: totalPalet,
        total_m3: totalM3,
        supir: d.staff?.name ?? "-",
        plat_mobil: d.vehicles?.plate_number ?? "-",
        so_status: so?.status,
      };
    });

  return NextResponse.json(result);
}
