export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("sales_orders")
    .select(`
      id,
      so_number,
      order_date,
      customer_id,
      customer_order_ref,
      purchase_type,
      ship_to_name,
      contact_phone,
      notes,
      delivery_address,

      customers (
        id,
        name
      ),

      sales_order_items (
        id,
        product_id,
        pallet_qty,
        total_pcs,
        price_per_m3,
        total_price,
        products (
          id,
          name,
          ukuran,
          isi_per_palet,
          kubik_m3
        )
      ),

      deposit_usages!left (
        id,
        deposit_id,
        do_count,
        amount_used,
        deposits (
          id,
          deposit_code,
          do_remaining,
          deposit_amount,
          price_lock_per_m3
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.json({ 
      error: error.message,
      details: error.details,
      hint: error.hint 
    }, { status: 500 });
  }

  return NextResponse.json(data);
}

// 🔥 PATCH HANDLER
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await req.json();

    console.log("UPDATE SO PAYLOAD:", body);

    // 1️⃣ Update Sales Order
    const { error: soError } = await supabase
      .from("sales_orders")
      .update({
        customer_order_ref: body.customer_order_ref,
        ship_to_name: body.ship_to_name,
        contact_phone: body.contact_phone,
        delivery_address: body.delivery_address,
        purchase_type: body.purchase_type,
        notes: body.notes,
      })
      .eq("id", id);

    if (soError) throw soError;

    // 2️⃣ Delete existing items
    const { error: deleteItemsError } = await supabase
      .from("sales_order_items")
      .delete()
      .eq("sales_order_id", id);

    if (deleteItemsError) throw deleteItemsError;

    // 3️⃣ Insert new items
    if (body.items && body.items.length > 0) {
      const itemsPayload = body.items.map((i: any) => ({
        sales_order_id: id,
        product_id: i.product_id,
        pallet_qty: Number(i.pallet_qty),
        total_pcs: Number(i.total_pcs),
        price_per_m3: Number(i.price_per_m3),
        total_price: Number(i.total_price),
        total_m3: Number(i.total_m3),
      }));

      const { error: itemsError } = await supabase
        .from("sales_order_items")
        .insert(itemsPayload);

      if (itemsError) throw itemsError;
    }

    // 4️⃣ Handle deposit changes
    // Delete existing deposit usage
    const { error: deleteDepositError } = await supabase
      .from("deposit_usages")
      .delete()
      .eq("sales_order_id", id);

    if (deleteDepositError) throw deleteDepositError;

    // Insert new deposit usage if provided
    if (body.deposit_id) {
      const { error: depositError } = await supabase
        .from("deposit_usages")
        .insert({
          deposit_id: body.deposit_id,
          sales_order_id: id,
          do_count: body.deposit_do_used || 1,
          amount_used: body.deposit_amount_used || 0,
        });

      if (depositError) throw depositError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("UPDATE SO ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}