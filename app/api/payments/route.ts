import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: deliveries, error } = await supabase
      .from("delivery_orders")
      .select("id, sj_number, delivery_date, sales_order_id")
      .order("delivery_date", { ascending: false });

    if (error) throw error;

    const today = new Date();

    const rows = await Promise.all(
      (deliveries ?? []).map(async (d, index) => {
        // ================= SALES ORDER =================
        let customerName = "-";
        let kepada = "-";
        let refSupplier = "-";
        let totalTagihan = 0;

        if (d.sales_order_id) {
          const { data: so } = await supabase
            .from("sales_orders")
            .select("customer_id, ship_to_name, customer_order_ref")
            .eq("id", d.sales_order_id)
            .single();

          kepada = so?.ship_to_name ?? "-";
          refSupplier = so?.customer_order_ref ?? "-";

          if (so?.customer_id) {
            const { data: cust } = await supabase
              .from("customers")
              .select("name")
              .eq("id", so.customer_id)
              .single();

            customerName = cust?.name ?? "-";
          }

          // ================= TOTAL TAGIHAN (SAMA DGN INVOICE) =================
          const { data: soItems } = await supabase
            .from("sales_order_items")
            .select("total_price, total_pcs")
            .eq("sales_order_id", d.sales_order_id);

          const subtotal =
            soItems?.reduce((s, i) => s + (i.total_price ?? 0), 0) ?? 0;

          const { data: retur } = await supabase
            .from("delivery_return_items")
            .select("return_pcs")
            .eq("delivery_order_id", d.id);

          const returPcs =
            retur?.reduce((s, r) => s + (r.return_pcs ?? 0), 0) ?? 0;

          // hitung harga satuan rata2
          const totalPcs =
            soItems?.reduce((s, i) => s + (i.total_pcs ?? 0), 0) ?? 0;

          const hargaSatuan =
            totalPcs > 0 ? Math.round(subtotal / totalPcs) : 0;

          const totalRetur = returPcs * hargaSatuan;
          totalTagihan = subtotal - totalRetur;
        }

        // ================= PAYMENT STATUS =================
        const { data: payment } = await supabase
          .from("payments")
          .select("status")
          .eq("delivery_order_id", d.id)
          .single();

        const status = payment?.status ?? "unpaid";

        // ================= OVERDUE =================
        const sjDate = d.delivery_date ? new Date(d.delivery_date) : null;
        const overdue =
          sjDate && status !== "paid"
            ? Math.max(
                0,
                Math.floor(
                  (today.getTime() - sjDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : 0;

        return {
          no: index + 1,
          delivery_order_id: d.id,
          no_sj: d.sj_number,
          tgl: d.delivery_date,
          supplier: customerName, // ✅ CUSTOMER
          ref_supplier: refSupplier,
          kepada,
          total_tagihan: totalTagihan,
          overdue,
          status,
        };
      })
    );

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
