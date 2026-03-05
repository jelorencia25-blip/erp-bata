// app/api/rekap/[id]/route.ts
// PATCH /api/rekap/[id]
// Body: { sudah_bayar?: boolean, sudah_tagih?: boolean, payment_date?: string | null }

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const allowed = ["sudah_bayar", "sudah_tagih", "payment_date"];
    const update: Record<string, any> = {};

    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("delivery_orders")
      .update(update)
      .eq("id", id)
      .select("id, sudah_bayar, sudah_tagih, payment_date")
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[PATCH /api/rekap/id]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}