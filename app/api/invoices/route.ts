export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 🔥 INI KUNCI
);

export async function GET() {
  try {
    /**
     * Ambil SJ yang SUDAH PROSES
     * (samain dengan SJ processed lu)
     */
    const { data: deliveries, error } = await supabase
      .from("delivery_orders")
      .select(`
        id,
        sj_number,
        delivery_date,
        status,
        sales_order:sales_orders (
          id,
          so_number,
          customer:customers (
            name
          )
        )
      `)
      .not("sj_number", "is", null)
      .order("delivery_date", { ascending: false });

    if (error) throw error;

    /**
     * Ambil delivery yang SUDAH ADA INVOICE
     */
    const { data: invoices } = await supabase
      .from("sales_invoices")
      .select("delivery_order_id");

    const usedIds = new Set(
      (invoices ?? []).map(i => i.delivery_order_id)
    );

    /**
     * Filter yang BELUM di-invoice
     */
    const result = (deliveries ?? []).filter(
      d => !usedIds.has(d.id)
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("INVOICE LIST ERROR:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
