export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // ✅ Langsung query SO yang belum ada di delivery_orders via SQL
    const { data, error } = await supabase.rpc('get_pending_deliveries');
    
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error("❌ GET PENDING DELIVERIES ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Gagal load pending deliveries" },
      { status: 500 }
    );
  }
}