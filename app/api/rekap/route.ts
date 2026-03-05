// // app/api/rekap/route.ts

// import { createClient } from "@supabase/supabase-js";
// import { NextResponse } from "next/server";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const dateFrom = searchParams.get("date_from");
//     const dateTo = searchParams.get("date_to");

//     // =============================
//     // 1. DELIVERY ORDERS
//     // =============================

//     let query = supabase
//       .from("delivery_orders")
//       .select(`
//         id,
//         sj_number,
//         delivery_date,
//         payment_date,
//         sales_order_id,
//         final_status
//       `)
//       .eq("final_status", "final")
//       .order("delivery_date", { ascending: false });

//     if (dateFrom) query = query.gte("delivery_date", dateFrom);
//     if (dateTo) query = query.lte("delivery_date", dateTo);

//     const { data: deliveries, error } = await query;

//     if (error) throw error;
//     if (!deliveries || deliveries.length === 0) {
//       return NextResponse.json([]);
//     }

//     const doIds = deliveries.map((d) => d.id);
//     const soIds = [...new Set(deliveries.map((d) => d.sales_order_id))];

//     // =============================
//     // 2. SALES ORDERS
//     // =============================

//     const { data: salesOrders } = await supabase
//       .from("sales_orders")
//       .select(`
//         id,
//         so_number,
//         order_date,
//         customer_id,
//         customer_order_ref,
//         delivery_address
//       `)
//       .in("id", soIds);

//     const soMap = new Map(
//       (salesOrders || []).map((s) => [s.id, s])
//     );

//     // =============================
//     // 3. CUSTOMERS
//     // =============================

//     const customerIds = [
//       ...new Set(
//         (salesOrders || [])
//           .map((s) => s.customer_id)
//           .filter(Boolean)
//       ),
//     ];

//     const { data: customers } = await supabase
//       .from("customers")
//       .select("id,name")
//       .in("id", customerIds);

//     const customerMap = new Map(
//       (customers || []).map((c) => [c.id, c.name])
//     );

//     // =============================
//     // 4. DELIVERY ITEMS
//     // =============================

//     const { data: deliveryItems } = await supabase
//       .from("delivery_items")
//       .select(`
//         delivery_order_id,
//         product_id,
//         pallet_qty,
//         total_pcs
//       `)
//       .in("delivery_order_id", doIds);

//     const diMap = new Map();

//     for (const di of deliveryItems || []) {
//       const arr = diMap.get(di.delivery_order_id) || [];
//       arr.push(di);
//       diMap.set(di.delivery_order_id, arr);
//     }

//     // =============================
//     // 5. PRODUCTS
//     // =============================

//     const productIds = [
//       ...new Set(
//         (deliveryItems || []).map((d) => d.product_id)
//       ),
//     ];

//     const { data: products } = await supabase
//       .from("products")
//       .select("id,name,ukuran")
//       .in("id", productIds);

//     const productMap = new Map(
//       (products || []).map((p) => [p.id, p])
//     );

//     // =============================
//     // 6. SALES ORDER ITEMS
//     // =============================

//     const { data: soItems } = await supabase
//       .from("sales_order_items")
//       .select(`
//         sales_order_id,
//         product_id,
//         price_per_m3,
//         total_price
//       `)
//       .in("sales_order_id", soIds);

//     const soiMap = new Map();

//     for (const soi of soItems || []) {
//       soiMap.set(
//         `${soi.sales_order_id}_${soi.product_id}`,
//         soi
//       );
//     }

//     // =============================
//     // 7. RETURNS
//     // =============================

//     const { data: returnItems } = await supabase
//       .from("delivery_return_items")
//       .select(`
//         delivery_order_id,
//         product_id,
//         return_pcs
//       `)
//       .in("delivery_order_id", doIds);

//     const retMap = new Map();

//     for (const r of returnItems || []) {
//       const key = `${r.delivery_order_id}_${r.product_id}`;
//       retMap.set(key, (retMap.get(key) || 0) + (r.return_pcs || 0));
//     }

//     // =============================
//     // 8. TAGIHAN PER SO
//     // =============================

//     const soTagihanMap = new Map();

//     for (const soi of soItems || []) {
//       soTagihanMap.set(
//         soi.sales_order_id,
//         (soTagihanMap.get(soi.sales_order_id) || 0) +
//           (soi.total_price || 0)
//       );
//     }

//     // =============================
//     // 9. BUILD ROWS
//     // =============================

//     const rows: any[] = [];

//     for (const d of deliveries) {
//       const so = soMap.get(d.sales_order_id);

//       const customerName =
//         customerMap.get(so?.customer_id) ?? "-";

//       const items = diMap.get(d.id) || [];

//       const tagihan =
//         soTagihanMap.get(d.sales_order_id) || 0;

//       for (const di of items) {
//         const product = productMap.get(di.product_id);

//         const soi =
//           soiMap.get(
//             `${d.sales_order_id}_${di.product_id}`
//           ) || null;

//         const retur =
//           retMap.get(
//             `${d.id}_${di.product_id}`
//           ) || 0;

//         rows.push({
//           id: d.id,
//           sj_number: d.sj_number,
//           delivery_date: d.delivery_date,

//           so_id: d.sales_order_id,
//           so_number: so?.so_number ?? "-",
//           order_date: so?.order_date ?? null,

//           customer_name: customerName,
//           customer_ref: so?.customer_order_ref ?? "-",
//           nama_toko: so?.delivery_address ?? "-",

//           product_name: product?.name ?? "-",
//           ukuran: product?.ukuran ?? "-",

//           harga_m3: soi?.price_per_m3 ?? null,

//           palet: di.pallet_qty,
//           total_pcs: di.total_pcs,

//           tagihan: tagihan,

//           jumlah_retur: retur,
//           jumlah_potongan: null,

//           payment_date: d.payment_date ?? null,
//         });
//       }
//     }

//     return NextResponse.json(rows);
//   } catch (err: any) {
//     console.error("REKAP ERROR:", err);

//     return NextResponse.json(
//       { error: err.message },
//       { status: 500 }
//     );
//   }
// }