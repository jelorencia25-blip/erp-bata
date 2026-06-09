import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { delivery_order_id } = await req.json();

    if (!delivery_order_id) {
      return NextResponse.json(
        { error: "delivery_order_id wajib" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ✅ UPDATE FINAL_STATUS (ONLY IF STILL DRAFT)
    const { data, error } = await supabase
      .from("delivery_orders")
      .update({
        final_status: "final",
      })
      .eq("id", delivery_order_id)
      .eq("final_status", "draft")
      .select("id");

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // ❗ penting: ga ada row ke-update
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Delivery sudah FINAL atau tidak ditemukan" },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}