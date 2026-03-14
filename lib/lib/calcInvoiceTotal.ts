export async function calcInvoiceTotal(
supabase: any,
deliveryId: string
) {

const { data: delivery } = await supabase
.from("delivery_orders")
.select("id, sales_order_id")
.eq("id", deliveryId)
.single();

if (!delivery) {
return {
so_number: "-",
supplier_name: "-",
kepada: "-",
customer_ref: "-",
total_tagihan: 0
};
}

const { data: salesOrder } = await supabase
.from("sales_orders")
.select("so_number, customer_id, ship_to_name, customer_order_ref")
.eq("id", delivery.sales_order_id)
.single();

let customerName = "-";

if (salesOrder?.customer_id) {
const { data: customer } = await supabase
.from("customers")
.select("name")
.eq("id", salesOrder.customer_id)
.single();


customerName = customer?.name ?? "-";


}

const { data: soItems } = await supabase
.from("sales_order_items")
.select("product_id, pallet_qty, total_pcs, price_per_m3, total_m3, total_price")
.eq("sales_order_id", delivery.sales_order_id);

const { data: returItems } = await supabase
.from("delivery_return_items")
.select("product_id, return_pcs")
.eq("delivery_order_id", deliveryId);

if (!soItems || soItems.length === 0) {
return {
so_number: salesOrder?.so_number ?? "-",
supplier_name: customerName,
kepada: salesOrder?.ship_to_name ?? "-",
customer_ref: salesOrder?.customer_order_ref ?? "-",
total_tagihan: 0
};
}

const productIds = new Set<string>([
...soItems.map((i: any) => i.product_id),
...(returItems ?? []).map((r: any) => r.product_id)
]);

const enriched = await Promise.all(


Array.from(productIds).map(async (productId: string) => {

  const soItem = soItems.find((i: any) => i.product_id === productId);
  const retur = (returItems ?? []).find((r: any) => r.product_id === productId);

  const { data: product } = await supabase
    .from("products")
    .select("kubik_m3")
    .eq("id", productId)
    .single();

  const actualPcs = soItem?.total_pcs ?? 0;
  const returnPcs = retur?.return_pcs ?? 0;

  const isNonM3 =
    !product?.kubik_m3 ||
    product.kubik_m3 === 0 ||
    ((soItem?.total_m3 ?? 0) === 0 && actualPcs === 0);

  let hargaSatuan = 0;
  let jumlah = 0;

  if (isNonM3) {

    jumlah = soItem?.total_price ?? 0;

  } else {

    if (soItem?.total_price && actualPcs > 0) {

      hargaSatuan = Math.round(
        soItem.total_price / actualPcs
      );

    } else if (
      soItem?.price_per_m3 &&
      soItem?.total_m3 &&
      actualPcs > 0
    ) {

      const totalHarga =
        soItem.price_per_m3 * soItem.total_m3;

      hargaSatuan = Math.round(
        totalHarga / actualPcs
      );

    }

    jumlah = actualPcs * hargaSatuan;

  }

  return {
    jumlah,
    harga_satuan: hargaSatuan,
    return_pcs: isNonM3 ? 0 : returnPcs,
    is_non_m3: isNonM3
  };

})


);

const subtotal = enriched.reduce(
(sum: number, i: any) => sum + i.jumlah,
0
);

const totalRetur = enriched.reduce(
(sum: number, i: any) =>
sum + (i.is_non_m3 ? 0 : i.return_pcs * i.harga_satuan),
0
);

const totalTagihan = subtotal - totalRetur;

return {
so_number: salesOrder?.so_number ?? "-",
supplier_name: customerName,
kepada: salesOrder?.ship_to_name ?? "-",
customer_ref: salesOrder?.customer_order_ref ?? "-",
total_tagihan: totalTagihan
};

}
