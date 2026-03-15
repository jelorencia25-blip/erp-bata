export const dynamic = 'force-dynamic'

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAllRows } from "@/lib/lib/getAllRows";

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
    // 1. DELIVERY ORDERS
    // =============================
    const allDeliveries = await getAllRows(
      supabase,
      "delivery_orders",
      "id, sj_number, delivery_date, sales_order_id, final_status",
      "delivery_date"
    );

    let deliveries = allDeliveries.filter((d: any) => d.final_status === "final");

    if (dateFrom) deliveries = deliveries.filter((d: any) => d.delivery_date && d.delivery_date >= dateFrom);
    if (dateTo) deliveries = deliveries.filter((d: any) => d.delivery_date && d.delivery_date <= dateTo);

    if (deliveries.length === 0) return NextResponse.json([]);

    const doIds = deliveries.map((d: any) => d.id);
    const soIds = [...new Set(deliveries.map((d: any) => d.sales_order_id).filter(Boolean))] as string[];

    // =============================
    // 2. SALES ORDERS
    // =============================
    const allSO = await getAllRows(
      supabase,
      "sales_orders",
      "id, so_number, order_date, customer_id, ship_to_name, deposit_id",
      "id"
    );

    const salesOrders = allSO.filter((s: any) => soIds.includes(s.id));
    const soMap = new Map(salesOrders.map((s: any) => [s.id, s]));

    // =============================
    // 3. CUSTOMERS
    // =============================
    const customerIds = [...new Set(salesOrders.map((s: any) => s.customer_id).filter(Boolean))] as string[];
    const allCustomers = await getAllRows(supabase, "customers", "id, name", "id");
    const customerMap = new Map(
      allCustomers
        .filter((c: any) => customerIds.includes(c.id))
        .map((c: any) => [c.id, c.name])
    );

    // =============================
    // 4. DEPOSITS
    // =============================
    const depositIds = [...new Set(salesOrders.map((s: any) => s.deposit_id).filter(Boolean))] as string[];
    const depositMap = new Map<string, string>();

    if (depositIds.length > 0) {
      const allDeposits = await getAllRows(supabase, "deposits", "id, deposit_code", "id");
      allDeposits
        .filter((d: any) => depositIds.includes(d.id))
        .forEach((d: any) => depositMap.set(d.id, d.deposit_code));
    }

    // =============================
    // 5. SALES ORDER ITEMS
    // =============================
    const allSOItems = await getAllRows(
      supabase,
      "sales_order_items",
      "sales_order_id, product_id, pallet_qty, total_pcs, price_per_m3, total_price",
      "sales_order_id"
    );

    const soItems = allSOItems.filter((i: any) => soIds.includes(i.sales_order_id));

    // =============================
    // 6. PRODUCTS
    // =============================
    const productIds = [...new Set(soItems.map((i: any) => i.product_id).filter(Boolean))] as string[];
    const allProducts = await getAllRows(supabase, "products", "id, name, ukuran", "id");
    const productMap = new Map(
      allProducts
        .filter((p: any) => productIds.includes(p.id))
        .map((p: any) => [p.id, p])
    );

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
    // 8. RETURNS per DO
    // =============================
    const allReturns = await getAllRows(
      supabase,
      "delivery_return_items",
      "delivery_order_id, product_id, return_pcs",
      "delivery_order_id"
    );

    const returnItems = allReturns.filter((r: any) => doIds.includes(r.delivery_order_id));

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
    // 9. PAYMENTS (paid_at)
    // =============================
    const allPayments = await getAllRows(
      supabase,
      "payments",
      "delivery_order_id, status, paid_at",
      "delivery_order_id"
    );

    const paymentMap = new Map(
      allPayments
        .filter((p: any) => doIds.includes(p.delivery_order_id))
        .map((p: any) => [p.delivery_order_id, p])
    );

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
        payment_date: (paymentMap.get(doKey) as any)?.paid_at ?? null, // ✅ dari tabel payments
        status: (paymentMap.get(doKey) as any)?.status ?? "unpaid", // ✅ tambah ini
      };
    });

    return NextResponse.json(rows);

  } catch (err: any) {
    console.error("REKAP ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}