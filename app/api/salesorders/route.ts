export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await req.json();

    console.log("ITEMS FROM FRONTEND:", JSON.stringify(body.items, null, 2));

    if (!body.customer_id) {
      return NextResponse.json(
        { error: "Customer wajib dipilih" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Items wajib diisi minimal 1 barang" },
        { status: 400 }
      );
    }

    // 🔥 LOG DEPOSIT DATA
    console.log("DEPOSIT DATA:", {
      deposit_id: body.deposit_id,
      do_used: body.deposit_do_used,
      amount_used: body.deposit_amount_used,
    });

    const { data, error } = await supabase.rpc("rpc_create_sales_order", {
      p_customer_id: body.customer_id,
      p_customer_order_ref: body.customer_order_ref ?? null,
      p_ship_to_name: body.ship_to_name ?? null,
      p_contact_phone: body.contact_phone ?? null,
      p_delivery_address: body.delivery_address ?? null,
      p_purchase_type: body.purchase_type ?? "Franco",
      p_notes: body.notes ?? null,
      p_items: body.items,
      // 🔥 DEPOSIT (OPTIONAL)
      p_deposit_id: body.deposit_id ?? null,
      p_deposit_do_used: body.deposit_do_used ?? 0,
      p_deposit_amount_used: body.deposit_amount_used ?? 0,
    });

    if (error) {
      console.error("RPC ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log("RPC SUCCESS:", data);

    // 🔥 DATA SEKARANG ARRAY, AMBIL FIRST ITEM
    return NextResponse.json({ 
      id: data[0].id,
      so_number: data[0].so_number 
    });
  } catch (err: any) {
    console.error("CATCH ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}