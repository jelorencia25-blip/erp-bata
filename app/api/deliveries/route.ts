export const dynamic = 'force-dynamic'


// app/api/deliveries/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


export async function POST(req: Request) {
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

  try {
    const body = await req.json();
    const { sales_order_id, vehicle_id, driver_id, returns }: {
      sales_order_id: string;
      vehicle_id: string;
      driver_id: string;
      returns?: Record<string, number>;
    } = body;

    console.log("📥 Request body:", { sales_order_id, vehicle_id, driver_id, returns });

   if (!sales_order_id) {
  return NextResponse.json({ error: "Sales Order wajib diisi" }, { status: 400 });
}

    // 🔹 1. Cek apakah SJ sudah ada untuk SO ini
    const { data: existingDelivery } = await supabase
      .from("v_deliveries_active")
      .select("*")
      .eq("sales_order_id", sales_order_id)
      .single();

    if (existingDelivery) {
      return NextResponse.json({ error: "Surat Jalan sudah dibuat untuk SO ini" }, { status: 400 });
    }

    // 🔹 2. Ambil SO & items dengan embed products
    const { data: so, error: soError } = await supabase
      .from("sales_orders")
      .select("*")
      .eq("id", sales_order_id)
      .single();

      if (so.status === "cancelled") {
  return NextResponse.json(
    { error: "Sales Order sudah cancelled, tidak bisa buat Surat Jalan" },
    { status: 400 }
  );
}

    if (soError || !so) {
      console.error("❌ SO Error:", soError);
      throw new Error("Sales Order tidak ditemukan");
    }

    // ⭐ FIX: Ambil dengan products di-embed
    const { data: soItems, error: soItemsError } = await supabase
      .from("sales_order_items")
      .select(`
        *,
        products (
          id,
          name,
          ukuran,
          isi_per_palet
        )
      `)
      .eq("sales_order_id", sales_order_id);

    if (soItemsError) {
      console.error("❌ SO Items Error:", soItemsError);
      throw soItemsError;
    }

    console.log("✅ SO Items loaded:", soItems?.length);

    // 🔹 3. Buat delivery_order
   const { data: delivery, error: deliveryError } = await supabase
  .from("delivery_orders")   // ✅ table asli
  .insert([{
    sales_order_id,
    vehicle_id,
    driver_id,
    status: "in_delivery",
    customer_id: so.customer_id,
    contact_name: so.ship_to_name,
    contact_phone: so.contact_phone,
    delivery_address: so.delivery_address,
  }])
  .select()
  .single();

    if (deliveryError) {
      console.error("❌ Delivery Error:", deliveryError);
      throw deliveryError;
    }

    console.log("✅ Delivery created:", delivery.id);

    // 🔹 4. Insert delivery_items
    const deliveryItemsPayload = soItems.map(item => ({
      delivery_order_id: delivery.id,
      product_id: item.product_id,
      pallet_qty: item.pallet_qty ?? 0,
      total_pcs: item.total_pcs,
    }));

    const { error: itemsError } = await supabase
      .from("delivery_items")
      .insert(deliveryItemsPayload);

    if (itemsError) {
      console.error("❌ Items Error:", itemsError);
      throw itemsError;
    }

    console.log("✅ Delivery items created:", deliveryItemsPayload.length);

    // 🔹 5. Insert delivery_return_items jika ada
    let returnPayload: any[] = [];

    if (returns && Object.keys(returns).length > 0) {
      returnPayload = Object.entries(returns)
        .filter(([soItemId, return_pcs]) => Number(return_pcs) > 0)
        .map(([soItemId, return_pcs]: [string, any]) => {
          const item = soItems.find(i => i.id === soItemId);
          
          if (!item) {
            console.warn(`⚠️ Item not found for ID: ${soItemId}`);
            return null;
          }

          // ⭐ FIX: Safely access nested products
          const isiPerPalet = item.products?.isi_per_palet ?? 1;

          return {
            delivery_order_id: delivery.id,
            product_id: item.product_id,
            return_pcs: Number(return_pcs),
            return_pallet_qty: Math.ceil(Number(return_pcs) / isiPerPalet),
            return_reason: "",
          };
        })
        .filter(Boolean); // Remove nulls

      if (returnPayload.length > 0) {
        const { error: returnError } = await supabase
          .from("delivery_return_items")
          .insert(returnPayload);
        
        if (returnError) {
          console.error("❌ Return Error:", returnError);
          throw returnError;
        }

        console.log("✅ Return items created:", returnPayload.length);
      }
    }

    // 🔹 6. Update status SO
    // 🔹 6. Update status SO (JANGAN override cancelled)
if (so.status === "confirmed" || so.status === "approved") {
  const { error: updateSOError } = await supabase
    .from("sales_orders")
    .update({ status: "in_delivery" })
    .eq("id", sales_order_id);

    if (updateSOError) {
      console.error("❌ Update SO Error:", updateSOError);
      throw updateSOError;
    }
  }
    console.log("✅ SO status updated");

    return NextResponse.json({
      success: true,
      delivery_id: delivery.id,
      so_number: so.so_number,
      items_created: deliveryItemsPayload.length,
      return_items_created: returnPayload.length,
    });

  } catch (err: any) {
    console.error("❌ CREATE DELIVERY ERROR:", err);
    return NextResponse.json({ 
      error: err.message || "Gagal membuat Surat Jalan" 
    }, { status: 500 });
  }
}