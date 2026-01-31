import { NextResponse } from "next/server";
import { supabase } from "@/lib/lib/supabase";

export async function POST(req: Request) {
  try {
    const row = await req.json();

    const { data, error } = await supabase
      .from("driver_trips")
      .update({
        uang_jalan: row.uang_jalan,
        biaya_tambahan: row.biaya_tambahan,
        total_uang_jalan: row.total_uang_jalan,
        status_pembayaran: row.status_pembayaran,
      })
      .eq("id", row.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

