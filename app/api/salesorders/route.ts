import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("ITEMS FROM FRONTEND:", JSON.stringify(body.items, null, 2));

    console.log("FULL BODY:", JSON.stringify(body, null, 2));
console.log("customer_id:", body.customer_id);
console.log("items:", body.items);


 if (!body.customer_id) {
  return NextResponse.json(
    { error: "Customer wajib dipilih" },
    { status: 400 }
  );
}

if (!Array.isArray(body.items) || body.items.length === 0) {
  return NextResponse.json(
    { error: "Items wajib diisi minimal 1 barang" },
    { status: 400 }
  );
}


    

   const { data, error } = await supabase
   .rpc( "rpc_create_sales_order",
  
  {
    p_customer_id: body.customer_id,
    p_customer_order_ref: body.customer_order_ref ?? null,
    p_ship_to_name: body.ship_to_name ?? null,
    p_contact_phone: body.contact_phone ?? null,
    p_delivery_address: body.delivery_address ?? null,
    p_purchase_type: body.purchase_type ?? "Franco",
    p_notes: body.notes ?? null,
    p_items: body.items,
  }
);


    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id: data[0].id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
