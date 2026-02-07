export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// =============================================
// GET SALES ORDER DETAIL
// =============================================
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Fetch SO data
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
        deposit_id,
        status,

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
          total_m3,
          total_price,
          products (
            id,
            name,
            ukuran,
            isi_per_palet,
            kubik_m3
          )
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    // 🔥 Fetch deposit info separately (bukan via deposit_usages)
    let depositInfo = null;
    if (data?.deposit_id) {
      const { data: deposit } = await supabase
        .from("deposits")
        .select(`
          id,
          deposit_code,
          do_remaining,
          deposit_amount,
          amount_remaining,
          price_lock_per_m3
        `)
        .eq("id", data.deposit_id)
        .single();
      
      depositInfo = deposit;
    }

    return NextResponse.json({
      ...data,
      deposit: depositInfo  // 🔥 Add deposit as separate field
    });

  } catch (err: any) {
    console.error("GET SO ERROR:", err);
    return NextResponse.json({ 
      error: err.message,
      details: err.details,
      hint: err.hint 
    }, { status: 500 });
  }
}

// =============================================
// UPDATE SALES ORDER
// =============================================
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

    // 1️⃣ Update Sales Order header
    const { error: soError } = await supabase
      .from("sales_orders")
      .update({
        order_date: body.order_date,
        customer_order_ref: body.customer_order_ref,
        ship_to_name: body.ship_to_name,
        contact_phone: body.contact_phone,
        delivery_address: body.delivery_address,
        purchase_type: body.purchase_type,
        notes: body.notes,
        deposit_id: body.deposit_id || null,  // Update deposit reference
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
        total_m3: Number(i.total_m3),
        total_price: Number(i.total_price),
      }));

      const { error: itemsError } = await supabase
        .from("sales_order_items")
        .insert(itemsPayload);

      if (itemsError) throw itemsError;
    }

    // ✅ DEPOSIT LOGIC REMOVED
    // Deposit will be deducted automatically when invoice is finalized via trigger
    // No manual insert to deposit_usages here

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("UPDATE SO ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// =============================================
// DELETE SALES ORDER
// =============================================
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Check if SO has delivery orders
    const { data: deliveries, error: checkError } = await supabase
      .from("delivery_orders")
      .select("id")
      .eq("sales_order_id", id)
      .limit(1);

    if (checkError) throw checkError;

    if (deliveries && deliveries.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete Sales Order with existing Delivery Orders" },
        { status: 400 }
      );
    }

    // Delete SO (items will cascade delete)
    const { error: deleteError } = await supabase
      .from("sales_orders")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("DELETE SO ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}