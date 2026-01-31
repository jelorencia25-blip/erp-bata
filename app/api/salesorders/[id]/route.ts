export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // 🔥 WAJIB await
const { data, error } = await supabase
  .from("sales_orders")
  .select(`
    id,
    so_number,
    order_date,
    customer_order_ref,
    purchase_type,
    ship_to_name,
    contact_phone,
    notes,
    delivery_address,

    customers (
      name
    ),

    sales_order_items (
      id,
      pallet_qty,
      total_pcs,
      price_per_m3,
      total_price,
      products (
        name,
        ukuran,
        isi_per_palet,
        kubik_m3
      )
    )
  `)
  .eq("id", id)
  .single();



  if (error) {
    
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}
