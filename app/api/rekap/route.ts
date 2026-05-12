export const dynamic = 'force-dynamic'

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    console.log("🚀 Starting rekap fetch...");

    // =============================
    // 1. DELIVERY ORDERS - MANUAL PAGINATION
    // =============================
    let allDeliveries: any[] = [];
    let from = 0;
    const batch = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("delivery_orders")
        .select("id, sj_number, delivery_date, sales_order_id, final_status")
        .range(from, from + batch - 1)
        .order("id", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) break;

      allDeliveries.push(...data);
      if (data.length < batch) break;
      from += batch;
    }

    console.log(`✅ Total deliveries: ${allDeliveries.length}`);

    // Filter final + date range
    let deliveries = allDeliveries.filter((d: any) => d.final_status === "final");
    if (dateFrom) deliveries = deliveries.filter((d: any) => d.delivery_date && d.delivery_date >= dateFrom);
    if (dateTo) deliveries = deliveries.filter((d: any) => d.delivery_date && d.delivery_date <= dateTo);

    console.log(`✅ Final deliveries (after date filter): ${deliveries.length}`);

    if (deliveries.length === 0) return NextResponse.json([]);

    const doIds = deliveries.map((d: any) => d.id);
    const soIds = [...new Set(deliveries.map((d: any) => d.sales_order_id).filter(Boolean))] as string[];

    console.log(`🔗 Unique SO IDs: ${soIds.length}`);

    // =============================
    // 2. SALES ORDERS - BATCH FETCH
    // =============================
    const salesOrders: any[] = [];
    const soChunkSize = 100;

    for (let i = 0; i < soIds.length; i += soChunkSize) {
      const chunk = soIds.slice(i, i + soChunkSize);
      
      const { data, error } = await supabase
        .from("sales_orders")
        .select("id, so_number, order_date, customer_id, ship_to_name, deposit_id")
        .in("id", chunk);

      if (error) {
        console.error(`❌ SO batch ${i} error:`, error);
        continue;
      }

      if (data) salesOrders.push(...data);
    }

    const soMap = new Map(salesOrders.map((s: any) => [s.id, s]));
    console.log(`✅ Sales orders: ${salesOrders.length}`);

    // =============================
    // 3. CUSTOMERS - BATCH FETCH
    // =============================
    const customerIds = [...new Set(salesOrders.map((s: any) => s.customer_id).filter(Boolean))] as string[];
    const customers: any[] = [];
    const custChunkSize = 100;

    for (let i = 0; i < customerIds.length; i += custChunkSize) {
      const chunk = customerIds.slice(i, i + custChunkSize);
      
      const { data } = await supabase
        .from("customers")
        .select("id, name")
        .in("id", chunk);

      if (data) customers.push(...data);
    }

    const customerMap = new Map(customers.map((c: any) => [c.id, c.name]));
    console.log(`✅ Customers: ${customers.length}`);

    // =============================
    // 4. DEPOSITS - BATCH FETCH
    // =============================
    const depositIds = [...new Set(salesOrders.map((s: any) => s.deposit_id).filter(Boolean))] as string[];
    const depositMap = new Map<string, string>();

    if (depositIds.length > 0) {
      const deposits: any[] = [];
      const depChunkSize = 100;

      for (let i = 0; i < depositIds.length; i += depChunkSize) {
        const chunk = depositIds.slice(i, i + depChunkSize);
        
        const { data } = await supabase
          .from("deposits")
          .select("id, deposit_code")
          .in("id", chunk);

        if (data) deposits.push(...data);
      }

      deposits.forEach((d: any) => depositMap.set(d.id, d.deposit_code));
      console.log(`✅ Deposits: ${deposits.length}`);
    }

    // =============================
    // 5. SALES ORDER ITEMS - BATCH FETCH
    // =============================
    const soItems: any[] = [];
    const soItemChunkSize = 100;

    for (let i = 0; i < soIds.length; i += soItemChunkSize) {
      const chunk = soIds.slice(i, i + soItemChunkSize);
      
      const { data } = await supabase
        .from("sales_order_items")
        .select("sales_order_id, product_id, pallet_qty, total_pcs, price_per_m3, total_price")
        .in("sales_order_id", chunk);

      if (data) soItems.push(...data);
    }

    console.log(`✅ SO Items: ${soItems.length}`);

    // =============================
    // 6. PRODUCTS - BATCH FETCH
    // =============================
    const productIds = [...new Set(soItems.map((i: any) => i.product_id).filter(Boolean))] as string[];
    const products: any[] = [];
    const prodChunkSize = 100;

    for (let i = 0; i < productIds.length; i += prodChunkSize) {
      const chunk = productIds.slice(i, i + prodChunkSize);
      
      const { data } = await supabase
        .from("products")
        .select("id, name, ukuran")
        .in("id", chunk);

      if (data) products.push(...data);
    }

    const productMap = new Map(products.map((p: any) => [p.id, p]));
    console.log(`✅ Products: ${products.length}`);

    // =============================
    // 7. AGGREGATE SO ITEMS per SO
    // =============================
    const soSubtotalMap = new Map<string, number>();
    const soUkuranMap = new Map<string, string[]>();
    const soPaletMap = new Map<string, number>();
    const soHargaMap = new Map<string, number[]>();

    for (const item of soItems) {
      const key = String(item.sales_order_id);
      const product = productMap.get(item.product_id);

      soSubtotalMap.set(key, (soSubtotalMap.get(key) || 0) + (item.total_price || 0));
      soPaletMap.set(key, (soPaletMap.get(key) || 0) + (item.pallet_qty || 0));

      if (product?.ukuran) {
        const arr = soUkuranMap.get(key) || [];
        if (!arr.includes(product.ukuran)) arr.push(product.ukuran);
        soUkuranMap.set(key, arr);
      }

      if (item.price_per_m3) {
        const arr = soHargaMap.get(key) || [];
        arr.push(item.price_per_m3);
        soHargaMap.set(key, arr);
      }
    }

    // =============================
    // 8. RETURNS per DO - BATCH FETCH
    // =============================
    const returnItems: any[] = [];
    const retChunkSize = 100;

    for (let i = 0; i < doIds.length; i += retChunkSize) {
      const chunk = doIds.slice(i, i + retChunkSize);
      
      const { data } = await supabase
        .from("delivery_return_items")
        .select("delivery_order_id, product_id, return_pcs")
        .in("delivery_order_id", chunk);

      if (data) returnItems.push(...data);
    }

    console.log(`✅ Return items: ${returnItems.length}`);

    const doReturPcsMap = new Map<string, number>();
    const doReturRupiahMap = new Map<string, number>();

    for (const r of returnItems) {
      const doKey = String(r.delivery_order_id);
      doReturPcsMap.set(doKey, (doReturPcsMap.get(doKey) || 0) + (r.return_pcs || 0));

      const delivery = deliveries.find((d: any) => d.id === r.delivery_order_id);
      if (delivery) {
        const soItem = soItems.find(
          (i: any) => i.sales_order_id === delivery.sales_order_id && i.product_id === r.product_id
        );
        if (soItem && soItem.total_pcs > 0) {
          const hargaSatuan = Math.round(soItem.total_price / soItem.total_pcs);
          doReturRupiahMap.set(doKey, (doReturRupiahMap.get(doKey) || 0) + r.return_pcs * hargaSatuan);
        }
      }
    }

    // =============================
    // 9. PAYMENTS - BATCH FETCH
    // =============================
    const payments: any[] = [];
    const payChunkSize = 100;

    for (let i = 0; i < doIds.length; i += payChunkSize) {
      const chunk = doIds.slice(i, i + payChunkSize);
      
      const { data } = await supabase
        .from("payments")
        .select("delivery_order_id, status, paid_at")
        .in("delivery_order_id", chunk);

      if (data) payments.push(...data);
    }

    const paymentMap = new Map(payments.map((p: any) => [p.delivery_order_id, p]));
    console.log(`✅ Payments: ${payments.length}`);

    // =============================
    // 10. BUILD ROWS
    // =============================
    const rows = deliveries.map((d: any) => {
      const so = soMap.get(String(d.sales_order_id));
      const soKey = String(d.sales_order_id);
      const doKey = String(d.id);

      const supplier = so?.customer_id ? customerMap.get(String(so.customer_id)) ?? "-" : "-";
      const depositCode = so?.deposit_id ? depositMap.get(String(so.deposit_id)) ?? "-" : "-";

      const subtotal = soSubtotalMap.get(soKey) || 0;
      const returRupiah = doReturRupiahMap.get(doKey) || 0;
      const tagihan = subtotal - returRupiah;

      const ukuranArr = soUkuranMap.get(soKey) || [];
      const hargaArr = soHargaMap.get(soKey) || [];

      return {
        id: d.id,
        order_date: so?.order_date ?? null,
        so_number: so?.so_number ?? "-",
        deposit_code: depositCode,
        sj_number: d.sj_number ?? "-",
        supplier,
        toko: so?.ship_to_name ?? "-",
        ukuran: ukuranArr.join(", ") || "-",
        palet: soPaletMap.get(soKey) || 0,
        harga_m3: hargaArr.length > 0 ? hargaArr[0] : null,
        jumlah_retur: doReturPcsMap.get(doKey) || 0,
        tagihan,
        payment_date: (paymentMap.get(doKey) as any)?.paid_at ?? null,
        status: (paymentMap.get(doKey) as any)?.status ?? "unpaid",
      };
    });

    console.log(`✅ Final rows: ${rows.length}`);

    return NextResponse.json(rows);

  } catch (err: any) {
    console.error("❌ REKAP ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}