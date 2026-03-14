export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { delivery_order_id, status } = await req.json();

  if (!delivery_order_id || !status) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { error } = await supabase
    .from("payments")
    .upsert(
      {
        delivery_order_id,
        status,
        paid_at: status === "paid" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "delivery_order_id" }
    );

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
