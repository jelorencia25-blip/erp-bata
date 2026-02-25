export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { id: deliveryId } = await params;

    if (!deliveryId) {
      return NextResponse.json(
        { error: "Invalid delivery ID" },
        { status: 400 }
      );
    }

    // ===============================
    // 1️⃣ DELIVERY ORDER
    // ===============================
    const { data: delivery, error: deliveryError } = await supabaseAdmin
      .from("delivery_orders")
      .select(
        "id, sj_number, delivery_date, sales_order_id, bank_account_id"
      )
      .eq("id", deliveryId)
      .single();

    if (deliveryError) throw deliveryError;
    if (!delivery)
      return NextResponse.json(
        { error: "Delivery tidak ditemukan" },
        { status: 404 }
      );

    // ===============================
    // 2️⃣ SALES ORDER
    // ===============================
    const { data: salesOrder } = await supabaseAdmin
      .from("sales_orders")
      .select(
        "so_number, order_date, delivery_address, customer_id, ship_to_name, customer_order_ref"
      )
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
    // 4️⃣ BANK ACCOUNT
    // ===============================
    let bankAccountDetails = null;
    if (delivery.bank_account_id) {
      const { data } = await supabaseAdmin
        .from("bank_accounts")
        .select("id, bank_name, account_number, account_holder")
        .eq("id", delivery.bank_account_id)
        .single();

      bankAccountDetails = data ?? null;
    }

    // ===============================
    // 5️⃣ SO ITEMS (SOURCE OF TRUTH)
    // ===============================
    const { data: soItems } = await supabaseAdmin
      .from("sales_order_items")
      .select(
        "id, product_id, pallet_qty, total_pcs, price_per_m3, total_m3, total_price"
      )
      .eq("sales_order_id", delivery.sales_order_id);

    // ===============================
    // 6️⃣ RETURN ITEMS
    // ===============================
    const { data: returItemsRaw } = await supabaseAdmin
      .from("delivery_return_items")
      .select("product_id, return_pcs")
      .eq("delivery_order_id", deliveryId);

    // ===============================
    // 🚨 Kalau kosong semua
    // ===============================
    if (!soItems || soItems.length === 0) {
      return NextResponse.json({
        invoice_number: `INV-${delivery.sj_number}`,
        sj_number: delivery.sj_number,
        transaction_date:
          delivery.delivery_date ||
          salesOrder?.order_date ||
          new Date(),
        so_number: salesOrder?.so_number ?? "-",
        kepada: customerName,
        alamat: salesOrder?.delivery_address ?? "-",
        items: [],
        subtotal_pembelian: 0,
        total_retur_pcs: 0,
        total_retur: 0,
        total_tagihan: 0,
      });
    }

    // ===============================
    // 7️⃣ GABUNGKAN PRODUCT ID SO + RETURN
    // ===============================
    const productIds = new Set([
      ...(soItems?.map((i) => i.product_id) ?? []),
      ...(returItemsRaw?.map((r) => r.product_id) ?? []),
    ]);

    const enrichedItems = await Promise.all(
      Array.from(productIds).map(async (productId) => {
        const soItem = soItems?.find(
          (i) => i.product_id === productId
        );

        const returnItem = returItemsRaw?.find(
          (r) => r.product_id === productId
        );

        const { data: product } = await supabaseAdmin
          .from("products")
          .select("name, ukuran, isi_per_palet")
          .eq("id", productId)
          .single();

        const actualPcs = soItem?.total_pcs ?? 0;
        const actualPalet = soItem?.pallet_qty ?? 0;
        const returnPcs = returnItem?.return_pcs ?? 0;

        let hargaSatuan = 0;

        if (soItem?.total_price && soItem.total_pcs > 0) {
          hargaSatuan = Math.round(
            soItem.total_price / soItem.total_pcs
          );
        } else if (
          soItem?.price_per_m3 &&
          soItem?.total_m3 &&
          soItem.total_pcs > 0
        ) {
          const totalHarga =
            soItem.price_per_m3 * soItem.total_m3;
          hargaSatuan = Math.round(
            totalHarga / soItem.total_pcs
          );
        }

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

    // ===============================
    // 8️⃣ HITUNG TOTAL
    // ===============================
    const subtotal = enrichedItems.reduce(
      (s, i) => s + i.jumlah,
      0
    );

    const totalReturPcs = enrichedItems.reduce(
      (s, i) => s + i.return_pcs,
      0
    );

    const totalReturRupiah = enrichedItems.reduce(
      (s, i) => s + i.return_pcs * i.harga_satuan,
      0
    );

    const totalTagihan = subtotal - totalReturRupiah;

    // ===============================
    // 9️⃣ FINAL RESPONSE
    // ===============================
    return NextResponse.json({
      invoice_number: `INV-${delivery.sj_number}`,
      sj_number: delivery.sj_number,
      transaction_date:
        delivery.delivery_date ||
        salesOrder?.order_date ||
        new Date(),
      so_number: salesOrder?.so_number ?? "-",
      supplier_name: customerName,
      kepada: salesOrder?.ship_to_name ?? "-",
      customer_ref: salesOrder?.customer_order_ref ?? "-",
      alamat: salesOrder?.delivery_address ?? "-",
      bank_account_id: delivery.bank_account_id ?? null,
      bank_account: bankAccountDetails,
      items: enrichedItems,
      subtotal_pembelian: subtotal,
      total_retur_pcs: totalReturPcs,
      total_retur: totalReturRupiah,
      total_tagihan: totalTagihan,
    });

  } catch (err: any) {
    console.error("INVOICE API ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ===============================
// PATCH
// ===============================
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { id: deliveryId } = await params;
    const body = await req.json();

    const { transaction_date, bank_account_id } = body;

    const updateData: any = {};

    if (transaction_date)
      updateData.delivery_date = transaction_date;

    if (bank_account_id)
      updateData.bank_account_id = bank_account_id;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabaseAdmin
        .from("delivery_orders")
        .update(updateData)
        .eq("id", deliveryId);

      if (error) throw error;
    }

    return GET(req, {
      params: Promise.resolve({ id: deliveryId }),
    });

  } catch (err: any) {
    console.error("UPDATE INVOICE ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update invoice" },
      { status: 500 }
    );
  }
}