export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";



export async function GET() {
  const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
  try {
    // 1️⃣ Ambil semua delivery return items
   const { data: returnItems, error } = await supabaseAdmin
  .from("delivery_return_items")
  .select(`
    id,
    delivery_order_id,
    product_id,
    return_pcs,
    return_reason,
    created_at,
    delivery_orders!inner (
      id,
      final_status,
      sj_number,
      sales_order_id,
      delivery_date
    )
  `)
  .eq("delivery_orders.final_status", "final")
  .order("created_at", { ascending: false });

if (error) throw error;

if (!returnItems || returnItems.length === 0) {
  return NextResponse.json([]);
}

    // 2️⃣ Enrich setiap return item dengan data lengkap
    const enrichedData = await Promise.all(
      returnItems.map(async (item) => {
        // Ambil delivery order
        const { data: delivery } = await supabaseAdmin
          .from("delivery_orders")
          .select("sj_number, sales_order_id, delivery_date")
          .eq("id", item.delivery_order_id)
          .single();

        // Ambil sales order
        let soNumber = "-";
        let customerName = "-";
        let hargaSatuan = 0;

        if (delivery?.sales_order_id) {
          const { data: salesOrder } = await supabaseAdmin
            .from("sales_orders")
            .select("so_number, customer_id")
            .eq("id", delivery.sales_order_id)
            .single();

          soNumber = salesOrder?.so_number ?? "-";

          // Ambil customer name
          if (salesOrder?.customer_id) {
            const { data: customer } = await supabaseAdmin
              .from("customers")
              .select("name")
              .eq("id", salesOrder.customer_id)
              .single();

            customerName = customer?.name ?? "-";
          }

          // 💰 Ambil HARGA dari sales_order_items
          const { data: soItem } = await supabaseAdmin
            .from("sales_order_items")
            .select("total_price, total_pcs, price_per_m3, total_m3")
            .eq("sales_order_id", delivery.sales_order_id)
            .eq("product_id", item.product_id)
            .single();

          if (soItem) {
            // Hitung harga satuan (sama seperti di invoice API)
            if (soItem.total_price && soItem.total_pcs && soItem.total_pcs > 0) {
              hargaSatuan = Math.round(soItem.total_price / soItem.total_pcs);
            } else if (soItem.price_per_m3 && soItem.total_m3 && soItem.total_pcs && soItem.total_pcs > 0) {
              const totalHarga = soItem.price_per_m3 * soItem.total_m3;
              hargaSatuan = Math.round(totalHarga / soItem.total_pcs);
            }
          }
        }

        // Ambil product info
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("name, ukuran")
          .eq("id", item.product_id)
          .single();

        // Hitung total
        const totalPrice = hargaSatuan * item.return_pcs;

        return {
          id: item.id,
          created_at: item.created_at,
          tanggal: delivery?.delivery_date ?? item.created_at,
          sj_number: delivery?.sj_number ?? "-",
          so_number: soNumber,
          customer_name: customerName,
          product_name: product?.name ?? "-",
          ukuran: product?.ukuran ?? "-",
          harga_satuan: hargaSatuan,
          return_pcs: item.return_pcs,
          total: totalPrice,
          return_reason: item.return_reason ?? "-",
        };
      })
    );

    return NextResponse.json(enrichedData);
  } catch (err: any) {
    console.error("RETURNS API ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}