export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAllRows } from "@/lib/lib/getAllRows";

export async function GET() {

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.SUPABASE_SERVICE_ROLE_KEY!
);

try {

/* ================= DELIVERY ================= */

const deliveriesAll = await getAllRows(
supabase,
"delivery_orders",
"id,sj_number,delivery_date,sales_order_id,final_status",
"id"
);

const deliveries = deliveriesAll.filter(
(d:any)=>d.final_status==="final"
);

/* ================= PAYMENTS ================= */

const payments = await getAllRows(
supabase,
"payments",
"delivery_order_id,status",
"delivery_order_id"
);

const paymentMap = new Map(
payments.map((p:any)=>[String(p.delivery_order_id),p.status])
);

/* ================= SALES ORDERS ================= */

const salesOrders = await getAllRows(
supabase,
"sales_orders",
"id,so_number,customer_id,ship_to_name,customer_order_ref,deposit_id",
"id"
);

const soMap = new Map(
salesOrders.map((s:any)=>[String(s.id),s])
);

/* ================= CUSTOMERS ================= */

const customers = await getAllRows(
supabase,
"customers",
"id,name",
"id"
);

const customerMap = new Map(
customers.map((c:any)=>[String(c.id),c.name])
);

/* ================= DEPOSITS ================= */

const deposits = await getAllRows(
supabase,
"deposits",
"id,deposit_code",
"id"
);

const depositMap = new Map(
deposits.map((d:any)=>[String(d.id),d.deposit_code])
);

/* ================= SO ITEMS ================= */

const soItems = await getAllRows(
supabase,
"sales_order_items",
"sales_order_id,product_id,total_price,total_pcs", // ✅ tambah product_id
"sales_order_id"
);

const soItemMap = new Map<string, any[]>();

for (const item of soItems){
  const key=String(item.sales_order_id);
  if(!soItemMap.has(key)) soItemMap.set(key,[]);
  soItemMap.get(key)!.push(item);
}

/* ================= RETURNS ================= */

const returns = await getAllRows(
supabase,
"delivery_return_items",
"delivery_order_id,product_id,return_pcs", // ✅ tambah product_id
"delivery_order_id"
);

// ✅ Map: do_id -> list of return items (bukan agregat)
const returnItemMap = new Map<string, any[]>();

for(const r of returns){
  const key=String(r.delivery_order_id);
  if(!returnItemMap.has(key)) returnItemMap.set(key,[]);
  returnItemMap.get(key)!.push(r);
}

/* ================= BUILD ================= */

const today=new Date();

const rows=deliveries.map((d:any,index:number)=>{

const so=d.sales_order_id
?soMap.get(String(d.sales_order_id))
:null;

const kepada=so?.ship_to_name??"-";
const refSupplier=so?.customer_order_ref??"-";

const depositCode=so?.deposit_id
?depositMap.get(String(so.deposit_id))??null
:null;

const supplier=so?.customer_id
?customerMap.get(String(so.customer_id))??"-"
:"-";

const items=d.sales_order_id
?soItemMap.get(String(d.sales_order_id))??[]
:[];

const subtotal=items.reduce(
(s:number,i:any)=>s+(i.total_price??0),0
);

// ✅ Hitung retur per produk — sama persis kayak invoice
const returItemList = returnItemMap.get(String(d.id)) ?? [];
let returRupiah = 0;
let returPcs = 0;
for (const ret of returItemList) {
  returPcs += ret.return_pcs ?? 0;
  const soItem = items.find((i:any) => i.product_id === ret.product_id);
  if (soItem && soItem.total_pcs > 0) {
    const hargaSatuan = Math.round(soItem.total_price / soItem.total_pcs);
    returRupiah += (ret.return_pcs ?? 0) * hargaSatuan;
  }
}

const totalTagihan=subtotal-returRupiah; // ✅ dikurangi retur per produk

const status=paymentMap.get(String(d.id))??"unpaid";

const sjDate=d.delivery_date?new Date(d.delivery_date):null;

const overdue=
sjDate&&status!=="paid"
?Math.max(
0,
Math.floor(
(today.getTime()-sjDate.getTime())/86400000
)
)
:0;

return{
  no:index+1,
  delivery_order_id:d.id,
  no_sj:d.sj_number,
  tgl:d.delivery_date,
  deposit_code:depositCode,
  supplier,
  ref_supplier:refSupplier,
  kepada,
  so_number:so?.so_number??null,
  total_tagihan:totalTagihan,
  overdue,
  status
};

});

return NextResponse.json(rows);

}catch(err:any){

console.error(err);

return NextResponse.json(
{error:err.message},
{status:500}
);

}

}