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
      sj_number,

      sales_orders (
        so_number,
        ship_to_name,
        delivery_address,
        customers ( name ),
        sales_order_items (
          total_pcs,
          pallet_qty,
          products (
            ukuran,
            kubik_m3
          )
        )
      ),

      staff:staff!delivery_orders_driver_id_fkey ( name ),
      vehicles ( plate_number )
    `)
    .not("sj_number", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (data ?? []).map((d: any) => {
    const so = d.sales_orders;

    let totalPcs = 0;
    let totalPalet = 0;

    const ukuranSet = new Set<string>();
    const kubikSet = new Set<string>();

    for (const item of so?.sales_order_items ?? []) {
      totalPcs += Number(item.total_pcs || 0);
      totalPalet += Number(item.pallet_qty || 0);

      if (item.products?.ukuran) {
        ukuranSet.add(item.products.ukuran);
      }

      // ✅ AMBIL APA ADANYA
      if (item.products?.kubik_m3 != null) {
        kubikSet.add(String(item.products.kubik_m3));
      }
    }

    return {
      id: d.id,
      sj_number: d.sj_number,
      so_number: so?.so_number ?? "-",
      pelanggan: so?.customers?.name ?? "-",
      kepada: so?.ship_to_name ?? "-",
      alamat: so?.delivery_address ?? "-",
      ukuran: Array.from(ukuranSet).join(", "),
      total_pcs: totalPcs,
      palet: totalPalet,
      kubik_m3: Array.from(kubikSet).join(", "),
      supir: d.staff?.name ?? "-",
      plat_mobil: d.vehicles?.plate_number ?? "-",
    };
  });

  return NextResponse.json(result);
}
