import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log("🚀 Starting invoice fetch...");

    // ✅ STEP 1: Fetch ALL deliveries with proper pagination
    let allDeliveries: any[] = [];
    let from = 0;
    const batch = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("delivery_orders")
        .select("id, sj_number, delivery_date, sudah_tagih, sudah_bayar, status, final_status, sales_order_id")
        .range(from, from + batch - 1)
        .order("id", { ascending: true }); // ⚠️ ORDER BY ID (stable)

      if (error) throw error;
      if (!data || data.length === 0) break;

      allDeliveries.push(...data);
      console.log(`📦 Fetched deliveries: ${allDeliveries.length}`);

      if (data.length < batch) break;
      from += batch;
    }

    console.log(`✅ Total deliveries: ${allDeliveries.length}`);

    // 🔍 DEBUG SO23541
    const so23541 = allDeliveries.find(d => d.id === "12551ab6-fb73-4b9b-ba2b-d46d221f415c");
    console.log("🔍 SO23541 found?", !!so23541);

    // ✅ STEP 2: Filter
    const finalDeliveries = allDeliveries
      .filter(d => d.final_status === "final")
      .filter(d => d.sj_number !== null);

    console.log(`✅ Final deliveries: ${finalDeliveries.length}`);

    // ✅ STEP 3: Fetch invoices with pagination
    let allInvoices: any[] = [];
    from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("sales_invoices")
        .select("delivery_order_id")
        .range(from, from + batch - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allInvoices.push(...data);
      if (data.length < batch) break;
      from += batch;
    }

    const usedIds = new Set(allInvoices.map(i => i.delivery_order_id));
    console.log(`📋 Existing invoices: ${usedIds.size}`);

    const availableDeliveries = finalDeliveries.filter(d => !usedIds.has(d.id));
    console.log(`💡 Available: ${availableDeliveries.length}`);

    // ✅ STEP 4: Fetch sales_orders in SMALL chunks (100 per batch)
    const salesOrderIds = [...new Set(availableDeliveries.map(d => d.sales_order_id).filter(Boolean))];
    console.log(`🔗 Unique SO IDs: ${salesOrderIds.length}`);

    const salesOrdersMap = new Map();
    const soChunkSize = 100;

    for (let i = 0; i < salesOrderIds.length; i += soChunkSize) {
      const chunk = salesOrderIds.slice(i, i + soChunkSize);
      
      const { data, error } = await supabase
        .from("sales_orders")
        .select("id, so_number, customer_id")
        .in("id", chunk);

      if (error) {
        console.error(`❌ SO batch ${i} error:`, error);
        continue;
      }

      (data ?? []).forEach(so => salesOrdersMap.set(so.id, so));
      
      if ((i / soChunkSize) % 10 === 0) { // Log every 10 batches
        console.log(`🔗 Fetched ${salesOrdersMap.size}/${salesOrderIds.length} SOs...`);
      }
    }

    console.log(`✅ Total SOs: ${salesOrdersMap.size}`);

    // ✅ STEP 5: Fetch customers
    const customerIds = [...new Set(
      Array.from(salesOrdersMap.values()).map((so: any) => so.customer_id).filter(Boolean)
    )];
    console.log(`👥 Unique customers: ${customerIds.length}`);

    const customersMap = new Map();
    const custChunkSize = 100;

    for (let i = 0; i < customerIds.length; i += custChunkSize) {
      const chunk = customerIds.slice(i, i + custChunkSize);
      
      const { data } = await supabase
        .from("customers")
        .select("id, name")
        .in("id", chunk);

      (data ?? []).forEach(c => customersMap.set(c.id, c));
    }

    console.log(`✅ Total customers: ${customersMap.size}`);

    // ✅ STEP 6: Merge data
    const result = availableDeliveries
      .map(d => {
        const so = salesOrdersMap.get(d.sales_order_id);
        const customer = so ? customersMap.get(so.customer_id) : null;

        return {
          ...d,
          sales_order: so ? {
            ...so,
            customer: customer || null,
            deposit: []
          } : null
        };
      })
      .filter(d => d.sales_order !== null);

    console.log(`📊 After merge: ${result.length} invoices`);

    // ✅ STEP 7: Fetch deposits
    if (result.length > 0) {
      const deliveryIds = result.map(d => d.id);
      const depositChunkSize = 100;
      const allDepositUsages: any[] = [];

      for (let i = 0; i < deliveryIds.length; i += depositChunkSize) {
        const chunk = deliveryIds.slice(i, i + depositChunkSize);
        
        const { data } = await supabase
          .from("deposit_usages")
          .select(`
            delivery_order_id,
            deposit:deposits (id, deposit_code)
          `)
          .in("delivery_order_id", chunk);

        if (data) allDepositUsages.push(...data);
      }

      const depositMap = new Map();
      allDepositUsages.forEach(du => {
        if (!depositMap.has(du.delivery_order_id)) {
          depositMap.set(du.delivery_order_id, []);
        }
        if (du.deposit) depositMap.get(du.delivery_order_id).push(du.deposit);
      });

      result.forEach(d => {
        if (d.sales_order) d.sales_order.deposit = depositMap.get(d.id) || [];
      });
    }

    // ✅ STEP 8: Sort
    result.sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());

    console.log(`✅ Final result: ${result.length} invoices`);

    return NextResponse.json(result);

  } catch (err: any) {
    console.error("❌ ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';