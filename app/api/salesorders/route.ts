export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// =============================================
// GET - LIST ALL SALES ORDERS
// =============================================
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data, error } = await supabase
      .from("sales_orders")
      .select(`
        *,
        customers(id, name),
        deposits(deposit_code)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform untuk flatten nested objects
    const transformed = data.map((so: any) => ({
      ...so,
      customer_name: so.customers?.[0]?.name || '-',
      deposit_code: so.deposits?.[0]?.deposit_code || '-',
    }));

    return NextResponse.json(transformed);

  } catch (err: any) {
    console.error("GET SALES ORDERS ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// =============================================
// POST - CREATE SALES ORDER
// =============================================
export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await req.json();

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

    const { data, error } = await supabase.rpc("rpc_create_sales_order", {
      p_customer_id: body.customer_id,
      p_customer_order_ref: body.customer_order_ref ?? null,
      p_ship_to_name: body.ship_to_name ?? null,
      p_contact_phone: body.contact_phone ?? null,
      p_delivery_address: body.delivery_address ?? null,
      p_purchase_type: body.purchase_type ?? "Franco",
      p_notes: body.notes ?? null,
      p_items: body.items,
      p_deposit_id: body.deposit_id ?? null,
      p_deposit_do_used: body.deposit_do_used ?? 0,
      p_deposit_amount_used: body.deposit_amount_used ?? 0,
    });

    if (error) {
      console.error("RPC ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      id: data,
      message: "Sales Order created successfully"
    });

  } catch (err: any) {
    console.error("CATCH ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}