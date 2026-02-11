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
    // Fetch SO data with proper joins
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

    if (error) {
      console.error("GET SO ERROR:", error);
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: "Sales Order not found" },
        { status: 404 }
      );
    }

    // 🔥 Fetch deposit info separately
    let depositInfo = null;
    if (data?.deposit_id) {
      const { data: deposit, error: depositError } = await supabase
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
      
      if (!depositError) {
        depositInfo = deposit;
      }
    }

    return NextResponse.json({
      ...data,
      deposit: depositInfo
    });

  } catch (err: any) {
    console.error("GET SO ERROR:", err);
    return NextResponse.json({ 
      error: err.message || "Failed to fetch Sales Order",
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

    // ✅ Validate required fields
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: "Items cannot be empty" },
        { status: 400 }
      );
    }

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
        deposit_id: body.deposit_id || null,
      })
      .eq("id", id);

    if (soError) {
      console.error("SO UPDATE ERROR:", soError);
      throw soError;
    }

    // 2️⃣ Delete existing items (cascade safe)
    const { error: deleteItemsError } = await supabase
      .from("sales_order_items")
      .delete()
      .eq("sales_order_id", id);

    if (deleteItemsError) {
      console.error("DELETE ITEMS ERROR:", deleteItemsError);
      throw deleteItemsError;
    }

    // 3️⃣ Insert new items
    const itemsPayload = body.items.map((i: any) => ({
      sales_order_id: id,
      product_id: i.product_id,
      pallet_qty: Number(i.pallet_qty) || 0,
      total_pcs: Number(i.total_pcs) || 0,
      price_per_m3: Number(i.price_per_m3) || 0,
      total_m3: Number(i.total_m3) || 0,
      total_price: Number(i.total_price) || 0,
    }));

    const { error: itemsError } = await supabase
      .from("sales_order_items")
      .insert(itemsPayload);

    if (itemsError) {
      console.error("INSERT ITEMS ERROR:", itemsError);
      throw itemsError;
    }

    // ✅ Return success
    return NextResponse.json({ 
      success: true,
      message: "Sales Order updated successfully" 
    });

  } catch (err: any) {
    console.error("UPDATE SO ERROR:", err);
    return NextResponse.json({ 
      error: err.message || "Failed to update Sales Order",
      details: err.details,
      hint: err.hint
    }, { status: 500 });
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
    // ✅ Check if SO has delivery orders
    const { data: deliveries, error: checkError } = await supabase
      .from("delivery_orders")
      .select("id")
      .eq("sales_order_id", id)
      .limit(1);

    if (checkError) {
      console.error("CHECK DELIVERY ERROR:", checkError);
      throw checkError;
    }

    if (deliveries && deliveries.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete Sales Order with existing Delivery Orders" },
        { status: 400 }
      );
    }

    // ✅ Check if SO is used in invoices
    const { data: invoices, error: invoiceCheckError } = await supabase
      .from("invoices")
      .select("id")
      .eq("sales_order_id", id)
      .limit(1);

    if (invoiceCheckError) {
      console.error("CHECK INVOICE ERROR:", invoiceCheckError);
      throw invoiceCheckError;
    }

    if (invoices && invoices.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete Sales Order with existing Invoices" },
        { status: 400 }
      );
    }

    // ✅ Delete SO (items will cascade delete via DB constraint)
    const { error: deleteError } = await supabase
      .from("sales_orders")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("DELETE SO ERROR:", deleteError);
      throw deleteError;
    }

    return NextResponse.json({ 
      success: true,
      message: "Sales Order deleted successfully" 
    });

  } catch (err: any) {
    console.error("DELETE SO ERROR:", err);
    return NextResponse.json({ 
      error: err.message || "Failed to delete Sales Order",
      details: err.details,
      hint: err.hint
    }, { status: 500 });
  }
}