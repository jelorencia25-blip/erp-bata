export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAllRows } from "@/lib/lib/getAllRows";

export async function GET() {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {

    const deliveries = await getAllRows(
      supabase,
      "delivery_orders",
      `
        id,
        sj_number,
        delivery_date,
        sudah_tagih,
        sudah_bayar,
        status,
        final_status,
        sales_order:sales_orders (
          id,
          so_number,
          customer:customers (
            name
          ),
          deposit:deposits (
            deposit_code
          )
        )
      `,
      "delivery_date"
    );

    const invoices = await getAllRows(
      supabase,
      "sales_invoices",
      "delivery_order_id"
    );

    const usedIds = new Set(
      (invoices ?? []).map((i: any) => i.delivery_order_id)
    );

    // Deduplicate deliveries by id (caused by one-to-many deposit join)
    const seen = new Set();
    const uniqueDeliveries = (deliveries ?? []).filter((d: any) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });

    const result = uniqueDeliveries
      .filter((d: any) => d.final_status === "final")
      .filter((d: any) => d.sj_number !== null)
      .filter((d: any) => !usedIds.has(d.id))
      .sort((a: any, b: any) =>
        new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime()
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