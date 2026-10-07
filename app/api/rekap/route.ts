export const dynamic = 'force-dynamic'

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Ambil angka pertama dari ukuran ("7,5" / "7.5" / "10") → bucket
function sizeBucket(u: unknown): "10" | "7.5" | null {
  if (u == null) return null;
  const m = String(u).match(/\d+(?:[.,]\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(",", "."));
  if (n === 10) return "10";
  if (n === 7.5) return "7.5";
  return null;
}

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    // =============================
    // 1. DELIVERY ORDERS - MANUAL PAGINATION
    // =============================
    const allDeliveries: any[] = [];
    let from = 0;
    const batch = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("delivery_orders")
        .select("id, sj_number, delivery_date, sales_order_id, final_status, no_gudang, customer_order_ref")
        .range(from, from + batch - 1)
        .order("id", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) break;

      allDeliveries.push(...data);
      if (data.length < batch) break;
      from += batch;
    }

    let deliveries = allDeliveries.filter((d: any) => d.final_status === "final");
    if (dateFrom) deliveries = deliveries.filter((d: any) => d.delivery_date && d.delivery_date >= dateFrom);
    if (dateTo) deliveries = deliveries.filter((d: any) => d.delivery_date && d.delivery_date <= dateTo);

    if (deliveries.length === 0) return NextResponse.json([]);

    const doIds = deliveries.map((d: any) => d.id);
    const soIds = [...new Set(deliveries.map((d: any) => d.sales_order_id).filter(Boolean))] as string[];
    const deliveryById = new Map(deliveries.map((d: any) => [String(d.id), d]));

    // Helper: fetch per chunk 100 via .in()
    async function fetchChunks(table: string, cols: string, key: string, ids: string[], size = 100): Promise<any[]> {
      const out: any[] = [];
      for (let i = 0; i < ids.length; i += size) {
        const chunk = ids.slice(i, i + size);
        const { data, error } = await supabase.from(table).select(cols).in(key, chunk);
        if (error) { console.error(`❌ ${table} chunk ${i} error:`, error); continue; }
        if (data) out.push(...data);
      }
      return out;
    }

    // =============================
    // 2. SALES ORDERS
    // =============================
    const salesOrders = await fetchChunks(
      "sales_orders",
      "id, so_number, order_date, customer_id, ship_to_name, deposit_id, customer_order_ref",
      "id",
      soIds
    );
    const soMap = new Map(salesOrders.map((s: any) => [String(s.id), s]));

    // =============================
    // 3. CUSTOMERS
    // =============================
    const customerIds = [...new Set(salesOrders.map((s: any) => s.customer_id).filter(Boolean))] as string[];
    const customers = await fetchChunks("customers", "id, name", "id", customerIds);
    const customerMap = new Map(customers.map((c: any) => [String(c.id), c.name]));

    // =============================
    // 4. DEPOSITS
    // =============================
    const depositIds = [...new Set(salesOrders.map((s: any) => s.deposit_id).filter(Boolean))] as string[];
    const deposits = depositIds.length ? await fetchChunks("deposits", "id, deposit_code", "id", depositIds) : [];
    const depositMap = new Map(deposits.map((d: any) => [String(d.id), d.deposit_code]));

    // =============================
    // 5. SALES ORDER ITEMS
    // =============================
    const soItems = await fetchChunks(
      "sales_order_items",
      "sales_order_id, product_id, pallet_qty, total_pcs, price_per_m3, total_price",
      "sales_order_id",
      soIds
    );

    // =============================
    // 6. RETURNS
    // =============================
    const returnItems = await fetchChunks(
      "delivery_return_items",
      "delivery_order_id, product_id, return_pcs",
      "delivery_order_id",
      doIds
    );

    // =============================
    // 7. PRODUCTS (dari SO items + return items)
    // =============================
    const productIds = [...new Set([
      ...soItems.map((i: any) => i.product_id),
      ...returnItems.map((r: any) => r.product_id),
    ].filter(Boolean))] as string[];
    const products = await fetchChunks("products", "id, name, ukuran", "id", productIds);
    const productMap = new Map(products.map((p: any) => [String(p.id), p]));

    // =============================
    // 8. AGGREGATE SO ITEMS per SO
    // =============================
    const soSubtotalMap = new Map<string, number>();
    const soUkuranMap = new Map<string, string[]>();
    const soPaletMap = new Map<string, number>();
    const soHargaMap = new Map<string, number[]>();
    const soItemByKey = new Map<string, any>(); // (so|product) → item pertama

    for (const item of soItems) {
      const key = String(item.sales_order_id);
      const product = productMap.get(String(item.product_id));

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

      const k = `${item.sales_order_id}|${item.product_id}`;
      if (!soItemByKey.has(k)) soItemByKey.set(k, item);
    }

    // =============================
    // 9. RETUR per DO — breakdown per ukuran
    // =============================
    type ReturAgg = { r10: number; r75: number; lain: number; total: number; rupiah: number };
    const emptyRetur = (): ReturAgg => ({ r10: 0, r75: 0, lain: 0, total: 0, rupiah: 0 });
    const doReturMap = new Map<string, ReturAgg>();
    let unmappedCount = 0;

    for (const r of returnItems) {
      const doKey = String(r.delivery_order_id);
      const pcs = Number(r.return_pcs) || 0;
      const agg = doReturMap.get(doKey) || emptyRetur();

      const bucket = sizeBucket(productMap.get(String(r.product_id))?.ukuran);
      if (bucket === "10") agg.r10 += pcs;
      else if (bucket === "7.5") agg.r75 += pcs;
      else { agg.lain += pcs; if (pcs > 0) unmappedCount++; }
      agg.total += pcs;

      const delivery = deliveryById.get(doKey);
      if (delivery) {
        const soItem = soItemByKey.get(`${delivery.sales_order_id}|${r.product_id}`);
        if (soItem && soItem.total_pcs > 0) {
          const hargaSatuan = Math.round(soItem.total_price / soItem.total_pcs);
          agg.rupiah += pcs * hargaSatuan;
        }
      }
      doReturMap.set(doKey, agg);
    }

    if (unmappedCount > 0) {
      console.warn(`⚠️ ${unmappedCount} return item dengan ukuran bukan 10/7.5 → masuk retur_lain`);
    }

    // =============================
    // 10. PAYMENTS
    // =============================
    const payments = await fetchChunks("payments", "delivery_order_id, status, paid_at", "delivery_order_id", doIds);
    const paymentMap = new Map(payments.map((p: any) => [String(p.delivery_order_id), p]));

    // =============================
    // 11. BUILD ROWS
    // =============================
    const rows = deliveries.map((d: any) => {
      const soKey = String(d.sales_order_id);
      const doKey = String(d.id);
      const so = soMap.get(soKey);

      const supplier = so?.customer_id ? customerMap.get(String(so.customer_id)) ?? "-" : "-";
      const depositCode = so?.deposit_id ? depositMap.get(String(so.deposit_id)) ?? "-" : "-";

      const subtotal = soSubtotalMap.get(soKey) || 0;
      const ret = doReturMap.get(doKey) || emptyRetur();
      const tagihan = subtotal - ret.rupiah;

      const ukuranArr = soUkuranMap.get(soKey) || [];
      const hargaArr = soHargaMap.get(soKey) || [];
      const pay = paymentMap.get(doKey);

      return {
        id: d.id,
        order_date: so?.order_date ?? null,
        so_number: so?.so_number ?? "-",
        deposit_code: depositCode,
        sj_number: d.sj_number ?? "-",
        no_gudang: d.no_gudang || "-",
        supplier,
        no_ref: so?.customer_order_ref || d.customer_order_ref || "-",
        toko: so?.ship_to_name ?? "-",
        ukuran: ukuranArr.join(", ") || "-",
        palet: soPaletMap.get(soKey) || 0,
        harga_m3: hargaArr.length > 0 ? hargaArr[0] : null,
        retur_10: ret.r10,
        retur_75: ret.r75,
        retur_lain: ret.lain,
        jumlah_retur: ret.total,
        retur_rupiah: ret.rupiah,
        tagihan,
        payment_date: pay?.paid_at ?? null,
        status: pay?.status ?? "unpaid",
      };
    });

    return NextResponse.json(rows);

  } catch (err: any) {
    console.error("❌ REKAP ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}