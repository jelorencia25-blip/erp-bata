export const dynamic = 'force-dynamic'


// app/api/deliveries/processed/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";



// ============ EXISTING GET METHOD ============
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "ID tidak boleh kosong" }, { status: 400 });
  }

  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
  
  try {
    const { data: delivery, error: deliveryError } = await supabase
      .from("delivery_orders")
      .select(`
        id,
        sj_number,
        delivery_date,
        driver_id,
        vehicle_id,
        sales_order_id
      `)
      .eq("id", id)
      .single();

    if (deliveryError) throw deliveryError;
    if (!delivery) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }

    let staff = null;
    if (delivery.driver_id) {
      const { data } = await supabase
        .from("staff")
        .select("id, name")
        .eq("id", delivery.driver_id)
        .single();
      staff = data ?? null;
    }

    let vehicle = null;
    if (delivery.vehicle_id) {
      const { data } = await supabase
        .from("vehicles")
        .select("id, plate_number")
        .eq("id", delivery.vehicle_id)
        .single();
      vehicle = data ?? null;
    }

    const { data: deliveryItems, error: itemsError } = await supabase
      .from("delivery_items")
      .select("id, product_id, pallet_qty, total_pcs, kubik_m3")
      .eq("delivery_order_id", id);

    if (itemsError) throw itemsError;

    const { data: returnItems } = await supabase
      .from("delivery_return_items")
      .select("*")
      .eq("delivery_order_id", id);

    const { data: salesOrder } = await supabase
      .from("sales_orders")
      .select("so_number, customer_id, customer_order_ref, ship_to_name, contact_phone, delivery_address, notes, purchase_type")
      .eq("id", delivery.sales_order_id)
      .single();

    let customerName = "-";
    if (salesOrder?.customer_id) {
      const { data } = await supabase
        .from("customers")
        .select("name")
        .eq("id", salesOrder.customer_id)
        .single();
      customerName = data?.name ?? "-";
    }

    const enrichedItems = await Promise.all(
      (deliveryItems || []).map(async (item) => {
        const { data: product } = await supabase
          .from("products")
          .select("name, ukuran, isi_per_palet, kubik_m3")
          .eq("id", item.product_id)
          .single();

        const returnItem = returnItems?.find(
          (r) => r.product_id === item.product_id
        );

        return {
          ...item,
          product_name: product?.name ?? "-",
          product_size: product?.ukuran ?? "-",
          isi_per_palet: product?.isi_per_palet ?? 0,
          return_pcs: returnItem?.return_pcs ?? 0,
          kubik_m3: product?.kubik_m3 ?? 0,
        };
      })
    );

    const enrichedReturns = await Promise.all(
      (returnItems || []).map(async (item) => {
        const { data: product } = await supabase
          .from("products")
          .select("name, ukuran")
          .eq("id", item.product_id)
          .single();

        return {
          ...item,
          product_name: product?.name ?? "-",
          product_size: product?.ukuran ?? "-",
        };
      })
    );

    return NextResponse.json({
      id: delivery.id,
      sj_number: delivery.sj_number ?? "-",
      so_number: salesOrder?.so_number ?? "-",
      order_date: delivery.delivery_date ?? "-",
      customer_name: customerName,
      customer_order_ref: salesOrder?.customer_order_ref ?? "-",
      ship_to_name: salesOrder?.ship_to_name ?? "-",
      contact_phone: salesOrder?.contact_phone ?? "-",
      delivery_address: salesOrder?.delivery_address ?? "-",
      notes: salesOrder?.notes ?? "-",
      purchase_type: salesOrder?.purchase_type ?? "Franco",
      staff,
      vehicle,
      delivery_items: enrichedItems,
      delivery_return_items: enrichedReturns,
    });

  } catch (err: any) {
    console.error("DELIVERY DETAIL ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Gagal load data" },
      { status: 500 }
    );
  }
}

// ============ ⭐ NEW PUT METHOD - UNTUK UPDATE ============
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "ID tidak boleh kosong" }, { status: 400 });
  }

    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );


  try {
    const body = await req.json();
    const { driver_id, vehicle_id, returns } = body;

    console.log("📝 Update Processed Delivery:", { id, driver_id, vehicle_id, returns });

    // Update driver & vehicle
    if (driver_id && vehicle_id) {
      const { error: updateError } = await supabase
        .from("delivery_orders")
        .update({
          driver_id,
          vehicle_id,
        })
        .eq("id", id);

      if (updateError) throw updateError;
      console.log("✅ Driver & Vehicle updated");
    }

    // Update return items
    if (returns && Object.keys(returns).length > 0) {
      // Hapus return lama
      await supabase
        .from("delivery_return_items")
        .delete()
        .eq("delivery_order_id", id);

      console.log("✅ Old returns deleted");

      // Ambil delivery_items untuk mapping product_id
      const { data: deliveryItems } = await supabase
        .from("delivery_items")
        .select("id, product_id")
        .eq("delivery_order_id", id);

      // Ambil product info untuk isi_per_palet
      const productIds = deliveryItems?.map(i => i.product_id) || [];
      const { data: products } = await supabase
        .from("products")
        .select("id, isi_per_palet")
        .in("id", productIds);

      // Build return payload
      const returnPayload = Object.entries(returns)
        .filter(([_, data]: [string, any]) => {
          const qty = data?.qty ?? data;
          return Number(qty) > 0;
        })
        .map(([itemId, data]: [string, any]) => {
          const deliveryItem = deliveryItems?.find(i => i.id === itemId);
          if (!deliveryItem) {
            console.warn(`⚠️ Item not found: ${itemId}`);
            return null;
          }

          const product = products?.find(p => p.id === deliveryItem.product_id);
          const returnPcs = Number(data?.qty ?? data);

          return {
            delivery_order_id: id,
            product_id: deliveryItem.product_id,
            return_pcs: returnPcs,
            return_pallet_qty: Math.ceil(returnPcs / (product?.isi_per_palet ?? 1)),
            return_reason: data?.reason ?? "",
          };
        })
        .filter(Boolean);

      if (returnPayload.length > 0) {
        const { error: insertError } = await supabase
          .from("delivery_return_items")
          .insert(returnPayload);

        if (insertError) throw insertError;
        console.log("✅ Returns updated:", returnPayload.length);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: "Delivery berhasil diperbarui" 
    });

  } catch (err: any) {
    console.error("❌ UPDATE PROCESSED DELIVERY ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Gagal update delivery" },
      { status: 500 }
    );
  }
}