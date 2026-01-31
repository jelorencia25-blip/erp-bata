import { NextResponse } from "next/server";
import { supabase } from "@/lib/lib/supabase";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const { data: delivery, error } = await supabase
    .from("delivery_orders")
    .select(`
      id,
      sj_number,
      status,
      vehicle_id,
      driver_id,
      sales_order_id,
      sales_orders (
        so_number,
        order_date,
        customer_order_ref,
        purchase_type,
        ship_to_name,
        contact_phone,
        delivery_address,
        notes,
        customers ( name ),
        sales_order_items (
          id,
          product_id,
          total_pcs,
          pallet_qty,
          products (
            name,
            ukuran,
            isi_per_palet,
            kubik_m3
          )
        )
      ),
      staff:staff!delivery_orders_driver_id_fkey ( id, name ),
      vehicles ( id, plate_number ),
      delivery_items ( product_id, total_pcs, pallet_qty, kubik_m3 ),
      delivery_return_items (
        product_id,
        return_pcs,
        products ( name, ukuran )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !delivery) {
    return NextResponse.json(
      { error: "Delivery tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json(delivery);
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await req.json();
  const { vehicle_id, driver_id, status, returns } = body;

  try {
    // Update delivery_orders
    const updateData: any = {};
    if (vehicle_id) updateData.vehicle_id = vehicle_id;
    if (driver_id) updateData.driver_id = driver_id;
    if (status) updateData.status = status;

    const { error: updateError } = await supabase
      .from("delivery_orders")
      .update(updateData)
      .eq("id", id);

    if (updateError) throw updateError;

    // Handle returns if provided
    if (returns && Object.keys(returns).length > 0) {
      // Delete existing returns
      await supabase
        .from("delivery_return_items")
        .delete()
        .eq("delivery_order_id", id);

      // Get SO items to map product_id
      const { data: delivery } = await supabase
        .from("delivery_orders")
        .select("sales_order_id")
        .eq("id", id)
        .single();
if (!delivery) {
  return NextResponse.json(
    { error: "Delivery tidak ditemukan" },
    { status: 404 }
  );
}

const { data: soItems } = await supabase
  .from("sales_order_items")
  .select("*")
  .eq("sales_order_id", delivery.sales_order_id);


      // Insert new returns
      const returnPayload = Object.entries(returns)
        .filter(([_, return_pcs]) => Number(return_pcs) > 0)
        .map(([soItemId, return_pcs]: [string, any]) => {
          const item = soItems?.find((i: any) => i.id === soItemId);
          if (!item) return null;

          return {
            delivery_order_id: id,
            product_id: item.product_id,
            return_pcs: Number(return_pcs),
            return_pallet_qty: Math.ceil(
              Number(return_pcs) / (item.products?.isi_per_palet ?? 1)
            ),
            return_reason: "",
          };
        })
        .filter(Boolean);

      if (returnPayload.length > 0) {
        await supabase.from("delivery_return_items").insert(returnPayload);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}