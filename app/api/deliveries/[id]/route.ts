export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabase } from "@/lib/lib/supabase";

/* =========================================================
   GET DELIVERY PROCESSED DETAIL
========================================================= */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: delivery, error } = await supabase
    .from("delivery_orders")
    .select(`
      id,
      sj_number,
      no_gudang,
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

      delivery_items (
        id,
        product_id,
        total_pcs,
        pallet_qty,
        kubik_m3
      ),

      delivery_return_items (
        id,
        product_id,
        return_pcs,
        return_reason,
        products ( name, ukuran )
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !delivery) {
    return NextResponse.json(
      { error: "Delivery tidak ditemukan" },
      { status: 404 }
    );
  }

 const so = delivery.sales_orders?.[0];
console.log("FULL DELIVERY OBJECT:", JSON.stringify(delivery, null, 2)); 

return NextResponse.json({
  id: delivery.id,
  sj_number: delivery.sj_number,
  no_gudang: delivery.no_gudang ?? null,
  status: delivery.status,

  so_number: so?.so_number,
  order_date: so?.order_date,
  customer_order_ref: so?.customer_order_ref,
  purchase_type: so?.purchase_type,
  ship_to_name: so?.ship_to_name,
  contact_phone: so?.contact_phone,
  delivery_address: so?.delivery_address,
  notes: so?.notes,

  customer_name: so?.customers?.[0]?.name,

  staff: delivery.staff,
  vehicle: delivery.vehicles,

  delivery_items: delivery.delivery_items.map((item: any) => {
  const soItem = so?.sales_order_items
    ?.find((s: any) => s.product_id === item.product_id);

  const product = soItem?.products?.[0];
    
  return {
    id: item.id,
    product_id: item.product_id,
    pallet_qty: item.pallet_qty,
    total_pcs: item.total_pcs,

    isi_per_palet: product?.isi_per_palet,
    product_name: product?.name,
    product_size: product?.ukuran,
  };
}),


  delivery_return_items: delivery.delivery_return_items,
});

}

/* =========================================================
   UPDATE DELIVERY (SUPIR, MOBIL, NO GUDANG, RETURNS)
========================================================= */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const {
    vehicle_id,
    driver_id,
    no_gudang, // 🔥 BARU
    status,
    returns,
  } = body;

  try {
    /* ================= UPDATE DELIVERY ================= */
    const updateData: any = {
  vehicle_id,
  driver_id,
  no_gudang, // ⬅️ LANGSUNG MASUK
  status,
};

// buang field undefined aja
Object.keys(updateData).forEach(
  (k) => updateData[k] === undefined && delete updateData[k]
);

const { error: updateError } = await supabase
  .from("delivery_orders")
  .update(updateData)
  .eq("id", id);

if (updateError) throw updateError;


    /* ================= HANDLE RETURNS ================= */
    if (returns && Object.keys(returns).length > 0) {
      // hapus retur lama
      await supabase
        .from("delivery_return_items")
        .delete()
        .eq("delivery_order_id", id);

      // ambil SO ID
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

      // ambil SO items
      const { data: soItems } = await supabase
        .from("sales_order_items")
        .select(`
          id,
          product_id,
          total_pcs,
          products ( isi_per_palet )
        `)
        .eq("sales_order_id", delivery.sales_order_id);

      // build payload retur
      const returnPayload = Object.entries(returns)
        .filter(([_, v]: any) => Number(v?.qty ?? v) > 0)
        .map(([soItemId, v]: [string, any]) => {
          const qty = Number(v?.qty ?? v);
          const item = soItems?.find((i: any) => i.id === soItemId);
          if (!item) return null;

          return {
            delivery_order_id: id,
            product_id: item.product_id,
            return_pcs: qty,
            return_pallet_qty: Math.ceil(
              qty / (item.products?.[0]?.isi_per_palet ?? 1)
            ),

            return_reason: v?.reason ?? "",
          };
        })
        .filter(Boolean);

      if (returnPayload.length > 0) {
        await supabase.from("delivery_return_items").insert(returnPayload);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
