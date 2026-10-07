export const dynamic = 'force-dynamic'
// ⚠️ Sesuaikan dengan region Supabase lo (sin1 = Singapore)
export const preferredRegion = 'sin1'
export const maxDuration = 60

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

// Jalankan fn untuk tiap item dengan maksimal `limit` paralel, hasil tetap urut
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

const CONCURRENCY = 8;
const CHUNK = 100;
const PAGE = 1000;

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const t0 = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    // =============================
    // 1. DELIVERY ORDERS — filter di DB, halaman paralel
    // =============================
    const buildDoQuery = () => {
      let q = supabase
        .from("delivery_orders")
        .select("id, sj_number, delivery_date, sales_order_id, final_status, no_gudang, customer_order_ref", { count: "exact" })
        .eq("final_status", "final");
      if (dateFrom) q = q.gte("delivery_date", dateFrom);
      if (dateTo) q = q.lte("delivery_date", dateTo);
      return q.order("id", { ascending: true });
    };

    const firstPage = await buildDoQuery().range(0, PAGE - 1);
    if (firstPage.error) throw firstPage.error;

    const deliveries: any[] = [...(firstPage.data || [])];
    const totalCount = firstPage.count ?? deliveries.length;

    if (totalCount > PAGE) {
      const offsets: number[] = [];
      for (let off = PAGE; off < totalCount; off += PAGE) offsets.push(off);
      const pages = await mapLimit(offsets, CONCURRENCY, async (off) => {
        const { data, error } = await buildDoQuery().range(off, off + PAGE - 1);
        if (error) throw error;
        return data || [];
      });
      for (const p of pages) deliveries.push(...p);
    }

    if (deliveries.length === 0) return NextResponse.json([]);

    const doIds = deliveries.map((d: any) => d.id);
    const soIds = [...new Set(deliveries.map((d: any) => d.sales_order_id).filter(Boolean))] as string[];
    const deliveryById = new Map(deliveries.map((d: any) => [String(d.id), d]));

    // Helper: fetch chunk 100 via .in(), paralel, error = gagal total (bukan diam-diam hilang)
    async function fetchChunks(table: string, cols: string, key: string, ids: string[]): Promise<any[]> {
      if (ids.length === 0) return [];
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));
      const results = await mapLimit(chunks, CONCURRENCY, async (chunk) => {
        const { data, error } = await supabase.from(table).select(cols).in(key, chunk);
        if (error) throw new Error(`${table}: ${error.message}`);
        return data || [];
      });
      return results.flat();
    }

    // =============================
    // 2. Query yang hanya butuh soIds / doIds → jalan bareng
    // =============================
    const [salesOrders, soItems, returnItems, payments] = await Promise.all([
      fetchChunks("sales_orders", "id, so_number, order_date, customer_id, ship_to_name, deposit_id, customer_order_ref", "id", soIds),
      fetchChunks("sales_order_items", "sales_order_id, product_id, pallet_qty, total_pcs, price_per_m3, total_price", "sales_order_id", soIds),
      fetchChunks("delivery_return_items", "delivery_order_id, product_id, return_pcs", "delivery_order_id", doIds),
      fetchChunks("payments", "delivery_order_id, status, paid_at", "delivery_order_id", doIds),
    ]);

    // =============================
    // 3. Query turunan (butuh hasil di atas) → jalan bareng
    // =============================
    const customerIds = [...new Set(salesOrders.map((s: any) => s.customer_id).filter(Boolean))] as string[];
    const depositIds = [...new Set(salesOrders.map((s: any) => s.deposit_id).filter(Boolean))] as string[];
    const productIds = [...new Set([
      ...soItems.map((i: any) => i.product_id),
      ...returnItems.map((r: any) => r.product_id),
    ].filter(Boolean))] as string[];

    const [customers, deposits, products] = await Promise.all([
      fetchChunks("customers", "id, name", "id", customerIds),
      fetchChunks("deposits", "id, deposit_code", "id", depositIds),
      fetchChunks("products", "id, name, ukuran", "id", productIds),
    ]);

    const soMap = new Map(salesOrders.map((s: any) => [String(s.id), s]));
    const customerMap = new Map(customers.map((c: any) => [String(c.id), c.name]));
    const depositMap = new Map(deposits.map((d: any) => [String(d.id), d.deposit_code]));
    const productMap = new Map(products.map((p: any) => [String(p.id), p]));
    const paymentMap = new Map(payments.map((p: any) => [String(p.delivery_order_id), p]));

    // =============================
    // 4. AGGREGATE SO ITEMS per SO
    // =============================
    const soSubtotalMap = new Map<string, number>();
    const soUkuranMap = new Map<string, string[]>();
    const soPaletMap = new Map<string, number>();
    const soHargaMap = new Map<string, number[]>();
    const soItemByKey = new Map<string, any>();

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
    // 5. RETUR per DO — breakdown per ukuran
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
    // 6. BUILD ROWS
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

    console.log(`✅ rekap: ${rows.length} rows in ${Date.now() - t0}ms`);
    return NextResponse.json(rows);

  } catch (err: any) {
    console.error("❌ REKAP ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}