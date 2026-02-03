export const dynamic = "force-dynamic";

// app/api/deposits/active/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customer_id");

  if (!customerId) {
    return NextResponse.json([], { status: 200 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("deposits")
    .select(`
      id,
      deposit_code,
      price_lock_per_m3,
      do_remaining
    `)
    .eq("customer_id", customerId)
    .eq("status", "active")
    .gt("do_remaining", 0)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("ACTIVE DEPOSIT ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}