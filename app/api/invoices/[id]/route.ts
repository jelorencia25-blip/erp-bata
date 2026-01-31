import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deliveryId } = await params;

    if (!deliveryId) {
      return NextResponse.json(
        { error: "Invalid delivery ID" },
        { status: 400 }
      );
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(deliveryId)) {
      return NextResponse.json(
        { error: "Invalid UUID format", receivedId: deliveryId },
        { status: 400 }
      );
    }

    // ===============================
    // 1️⃣ DELIVERY ORDER
    // ===============================
    const { data: delivery, error: deliveryError } = await supabaseAdmin
      .from("delivery_orders")
      .select("id, sj_number, delivery_date, sales_order_id")
      .eq("id", deliveryId)
      .single();

    if (deliveryError) throw deliveryError;
    if (!delivery) {
      return NextResponse.json(
        { error: "Delivery tidak ditemukan" },
        { status: 404 }
      );
    }

    // ===============================
    // 2️⃣ SALES ORDER
    // ===============================
    const { data: salesOrder } = await supabaseAdmin
      .from("sales_orders")
      .select("so_number, order_date, delivery_address, customer_id, ship_to_name, customer_order_ref")
      .eq("id", delivery.sales_order_id)
      .single();

    // ===============================
    // 3️⃣ CUSTOMER
    // ===============================
    let customerName = "-";
    if (salesOrder?.customer_id) {
      const { data } = await supabaseAdmin
        .from("customers")
        .select("name")
        .eq("id", salesOrder.customer_id)
        .single();
      customerName = data?.name ?? "-";
    }

    // ===============================
    // 4️⃣ SALES ORDER ITEMS (PRIMARY SOURCE)
    // ===============================
    const { data: soItems } = await supabaseAdmin
      .from("sales_order_items")
      .select("id, product_id, pallet_qty, total_pcs, price_per_m3, total_m3, total_price")
      .eq("sales_order_id", delivery.sales_order_id);

    console.log("SO Items:", soItems);

    // ===============================
    // 5️⃣ DELIVERY ITEMS (untuk cross-check)
    // ===============================
    const { data: deliveryItems } = await supabaseAdmin
      .from("delivery_items")
      .select("product_id, pallet_qty, total_pcs")
      .eq("delivery_order_id", deliveryId);

    console.log("Delivery Items:", deliveryItems);

    // ===============================
    // 🚨 KALAU KEDUA SUMBER KOSONG
    // ===============================
    if ((!soItems || soItems.length === 0) && (!deliveryItems || deliveryItems.length === 0)) {
      return NextResponse.json({
        invoice_number: `INV-${delivery.sj_number}`,
        sj_number: delivery.sj_number,
        transaction_date: delivery.delivery_date || salesOrder?.order_date || new Date(),
        so_number: salesOrder?.so_number ?? "-",
        supplier_name: "PT Bata Indonesia",
        kepada: customerName,
        ship_to_name: salesOrder?.ship_to_name ?? "-",
        alamat: salesOrder?.delivery_address ?? "-",
        items: [],
        subtotal_pembelian: 0,
        total_retur_pcs: 0,
        total_retur: 0,
        total_tagihan: 0,
        _warning: "Tidak ada data items di sales_order_items maupun delivery_items. Silakan input items terlebih dahulu."
      });
    }

    // ===============================
    // 6️⃣ RETURN ITEMS
    // ===============================
    const { data: returItemsRaw } = await supabaseAdmin
      .from("delivery_return_items")
      .select("product_id, return_pcs")
      .eq("delivery_order_id", deliveryId);

    console.log("Return Items:", returItemsRaw);

    // ===============================
    // 7️⃣ ENRICH ITEMS
    // ===============================
    // Pakai SO items kalau ada, fallback ke delivery items
    const sourceItems = (soItems && soItems.length > 0) ? soItems : deliveryItems;
    const itemSource = (soItems && soItems.length > 0) ? "sales_order" : "delivery";

    const enrichedItems = await Promise.all(
      (sourceItems || []).map(async (item) => {
        // Fetch product info
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("name, ukuran, isi_per_palet")
          .eq("id", item.product_id)
          .single();

        // Cari delivery item untuk product ini (actual yang dikirim)
        const deliveredItem = deliveryItems?.find(
          (di) => di.product_id === item.product_id
        );

        // Cari return item untuk product ini
        const returnItem = returItemsRaw?.find(
          (r) => r.product_id === item.product_id
        );

        // Pakai delivery qty kalau ada, fallback ke item qty
        const actualPcs = deliveredItem?.total_pcs ?? item.total_pcs ?? 0;
        const actualPalet = deliveredItem?.pallet_qty ?? item.pallet_qty ?? 0;
        const returnPcs = returnItem?.return_pcs ?? 0;

        // Harga: coba dari total_price dulu, fallback ke price_per_m3
        let hargaSatuan = 0;
        if ((item as any).total_price && actualPcs > 0) {
          // Hitung harga satuan dari total_price / total_pcs
          hargaSatuan = Math.round((item as any).total_price / actualPcs);
        } else if ((item as any).price_per_m3 && (item as any).total_m3) {
          // Atau dari price_per_m3 * total_m3 / total_pcs
          const totalHarga = (item as any).price_per_m3 * (item as any).total_m3;
          hargaSatuan = actualPcs > 0 ? Math.round(totalHarga / actualPcs) : 0;
        }

        // Hitung jumlah (PCS yang dikirim dikali harga)
        const jumlah = actualPcs * hargaSatuan;

        return {
          product_name: product?.name ?? "-",
          product_size: product?.ukuran ?? "-",
          isi_per_palet: product?.isi_per_palet ?? 0,
          palet: actualPalet,
          pcs: actualPcs,
          return_pcs: returnPcs,
          harga_satuan: hargaSatuan,
          jumlah: jumlah,
        };
      })
    );

    console.log("Enriched Items:", enrichedItems);

    // ===============================
    // 8️⃣ HITUNG TOTAL
    // ===============================
    const subtotal = enrichedItems.reduce(
      (s, i) => s + (i.jumlah ?? 0),
      0
    );

    const totalReturPcs = enrichedItems.reduce(
      (s, i) => s + (i.return_pcs ?? 0),
      0
    );

    // Total retur dalam rupiah (return PCS * harga satuan)
    const totalReturRupiah = enrichedItems.reduce((sum, item) => {
      return sum + (item.return_pcs * item.harga_satuan);
    }, 0);

    // ===============================
    // 9️⃣ RESPONSE FINAL
    // ===============================
    return NextResponse.json({
      invoice_number: `INV-${delivery.sj_number}`,
      sj_number: delivery.sj_number,
      transaction_date: delivery.delivery_date || salesOrder?.order_date || new Date(),
      so_number: salesOrder?.so_number ?? "-",
      supplier_name: "PT Bata Indonesia",
      kepada: customerName,
      ship_to_name: salesOrder?.ship_to_name ?? "-",
      customer_ref: salesOrder?.customer_order_ref ?? "-",
      alamat: salesOrder?.delivery_address ?? "-",
      items: enrichedItems,
      subtotal_pembelian: subtotal,
      total_retur_pcs: totalReturPcs,
      total_retur: totalReturRupiah,
      total_tagihan: subtotal - totalReturRupiah,
      _item_source: itemSource,
    });

  } catch (err: any) {
    console.error("INVOICE API ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}