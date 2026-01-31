export const dynamic = 'force-dynamic'


import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    /**
     * 1️⃣ Ambil SEMUA sales_order_id yang SUDAH punya delivery_orders
     */
    const { data: deliveredSO, error: deliveredError } = await supabase
      .from("delivery_orders")
      .select("sales_order_id");

    if (deliveredError) {
      throw deliveredError;
    }

    const deliveredIds = (deliveredSO ?? [])
      .map(d => d.sales_order_id)
      .filter(Boolean);

    /**
     * 2️⃣ Ambil SALES ORDER yang TIDAK ADA di delivery_orders
     */
    let query = supabase
      .from("sales_orders")
      .select(`
        id,
        so_number,
        ship_to_name,
        delivery_address,
        sales_order_items (
          total_pcs,
          pallet_qty
        )
      `)
      .order("created_at", { ascending: false });

    // 🔥 INI KUNCINYA
    if (deliveredIds.length > 0) {
      query = query.not("id", "in", `(${deliveredIds.join(",")})`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    /**
     * 3️⃣ Mapping ke format table deliveries
     */
    const rows = (data ?? []).map((so: any) => {
      const totalPCS =
        so.sales_order_items?.reduce(
          (sum: number, i: any) => sum + (i.total_pcs ?? 0),
          0
        ) ?? 0;

      const totalPalet =
        so.sales_order_items?.reduce(
          (sum: number, i: any) => sum + (i.pallet_qty ?? 0),
          0
        ) ?? 0;

      return {
        id: so.id,
        sj_number: "-", // belum ada SJ
        so_number: so.so_number,
        pelanggan: "-", // bisa ganti customer name kalau ada
        kepada: so.ship_to_name ?? "-",
        alamat: so.delivery_address ?? "-",
        ukuran: "-",
        total_pcs: totalPCS,
        palet: totalPalet,
        kubik_m3: null,
        supir: "-",
        plat_mobil: "-"
      };
    });

    return NextResponse.json(rows);

  } catch (err: any) {
    console.error("❌ GET PENDING DELIVERIES ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Gagal load pending deliveries" },
      { status: 500 }
    );
  }
}
