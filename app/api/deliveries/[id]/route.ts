export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabase } from "@/lib/lib/supabase";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: delivery, error } = await supabase
    .from("delivery_orders")
     .select(`
    *,

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
          total_m3,
          price_per_m3,
          total_price,
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



// 🔥 TAMBAHKAN INI TEPAT DI SINI (SEBELUM if error)
console.log("🔍 FULL DELIVERY OBJECT:", delivery);
console.log("🔍 no_gudang dari Supabase:", delivery?.no_gudang);
console.log("🔍 Type of no_gudang:", typeof delivery?.no_gudang);

  if (error || !delivery) {
    console.error("SUPABASE ERROR:", error);
    return NextResponse.json(
      { error: "Delivery tidak ditemukan" },
      { status: 404 }
    );
  }

  // 🔥 FIX: Akses array pertama untuk sales_orders
  const so = Array.isArray(delivery.sales_orders) 
    ? delivery.sales_orders[0] 
    : delivery.sales_orders;

  console.log("=== DEBUG GET ===");
  console.log("no_gudang from DB:", delivery.no_gudang);
  console.log("sales_orders structure:", delivery.sales_orders);
  console.log("=================");

  // 🔥 BUILD delivery_items dengan data lengkap
  const deliveryItems = (delivery.delivery_items || []).map((item: any) => {
    const soItem = so?.sales_order_items?.find((s: any) => s.product_id === item.product_id);
    const product = Array.isArray(soItem?.products) 
      ? soItem.products[0] 
      : soItem?.products;
    
    const returnItem = delivery.delivery_return_items?.find(
      (r: any) => r.product_id === item.product_id
    );

    return {
      id: item.id,
      product_id: item.product_id,
      pallet_qty: item.pallet_qty,
      total_pcs: item.total_pcs,
      isi_per_palet: product?.isi_per_palet ?? 0,
      product_name: product?.name ?? "-",
      product_size: product?.ukuran ?? "",
      return_pcs: returnItem?.return_pcs ?? 0,
    };
  });

  // 🔥 FIX: Akses array pertama untuk staff & vehicles
  const staff = Array.isArray(delivery.staff) 
    ? delivery.staff[0] 
    : delivery.staff;
  
  const vehicle = Array.isArray(delivery.vehicles) 
    ? delivery.vehicles[0] 
    : delivery.vehicles;

  const customers = Array.isArray(so?.customers) 
    ? so.customers[0] 
    : so?.customers;

  const responseData = {
    id: delivery.id,
    sj_number: delivery.sj_number,
   no_gudang: delivery.no_gudang ?? null, // ✅ Ganti "" jadi null
  TEST_FIELD: "HALO_DARI_API_PROCESSED", // ✅ TAMBAHKAN INI
  TEST_NO_GUDANG: delivery.no_gudang, // ✅ TAMBAHKAN INI JUGA
    status: delivery.status,
    final_status: delivery.final_status,

    so_number: so?.so_number ?? "-",
    order_date: so?.order_date ?? "-",
    customer_order_ref: so?.customer_order_ref ?? "-",
    purchase_type: so?.purchase_type ?? "-",
    ship_to_name: so?.ship_to_name ?? "-",
    contact_phone: so?.contact_phone ?? "-",
    delivery_address: so?.delivery_address ?? "-",
    notes: so?.notes ?? "-",

    customer_name: customers?.name ?? "-",

    staff: staff || null,
    vehicle: vehicle || null,

    delivery_items: deliveryItems,
    delivery_return_items: delivery.delivery_return_items || [],
  };

  console.log("=== RESPONSE DATA ===");
  console.log("no_gudang in response:", responseData.no_gudang);
  console.log("====================");

  return NextResponse.json(responseData);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const {
    vehicle_id,
    driver_id,
    no_gudang,
    status,
    returns,
  } = body;

  console.log("=== PUT RECEIVED ===");
  console.log({ vehicle_id, driver_id, no_gudang, status, returns });
  console.log("===================");

  try {
    const updateData: any = {
      vehicle_id: vehicle_id || null,
      driver_id: driver_id || null,
      no_gudang: no_gudang !== undefined ? (no_gudang || "") : undefined,  // ✅ ALLOW empty string
      status: status || undefined,
    };

    // Remove undefined
    Object.keys(updateData).forEach(
      (k) => updateData[k] === undefined && delete updateData[k]
    );

    console.log("=== UPDATE DATA ===");
    console.log(updateData);
    console.log("==================");

    const { error: updateError } = await supabase
      .from("delivery_orders")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error("UPDATE ERROR:", updateError);
      throw updateError;
    }

    // ================= HANDLE RETURNS =================
    if (returns && Object.keys(returns).length > 0) {
      await supabase
        .from("delivery_return_items")
        .delete()
        .eq("delivery_order_id", id);

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
        .select(`
          id,
          product_id,
          total_pcs,
          products ( isi_per_palet )
        `)
        .eq("sales_order_id", delivery.sales_order_id);

      const { data: allDeliveryItems } = await supabase
        .from("delivery_items")
        .select("id, product_id")
        .eq("delivery_order_id", id);

      const returnPayload = [];

      for (const [deliveryItemId, v] of Object.entries(returns)) {
        const qty = Number((v as any)?.qty ?? v);
        
        if (qty <= 0) continue;

        const deliveryItem = allDeliveryItems?.find((di: any) => di.id === deliveryItemId);
        
        if (!deliveryItem) {
          console.warn(`Delivery item ${deliveryItemId} not found`);
          continue;
        }

        const soItem = soItems?.find((i: any) => i.product_id === deliveryItem.product_id);
        
        if (!soItem) {
          console.warn(`SO item for product ${deliveryItem.product_id} not found`);
          continue;
        }

        const products = Array.isArray(soItem.products) 
          ? soItem.products[0] 
          : soItem.products;

        returnPayload.push({
          delivery_order_id: id,
          product_id: deliveryItem.product_id,
          return_pcs: qty,
          return_pallet_qty: Math.ceil(
            qty / (products?.isi_per_palet ?? 1)
          ),
          return_reason: (v as any)?.reason ?? "",
        });
      }

      if (returnPayload.length > 0) {
        const { error: returnError } = await supabase
          .from("delivery_return_items")
          .insert(returnPayload);

        if (returnError) {
          console.error("RETURN INSERT ERROR:", returnError);
          throw returnError;
        }
      }
    }

    console.log("=== UPDATE SUCCESS ===");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PUT ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}