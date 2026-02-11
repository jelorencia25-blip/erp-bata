export const dynamic = 'force-dynamic';import { NextResponse } from "next/server";
import { supabase } from "@/lib/lib/supabase";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ✅ WAJIB await

  const body = await req.json();

  const { data, error } = await supabase
    .from("delivery_orders")
    .update(body)
    .eq("id", id) // ✅ pakai id yg sudah di-unwrapped
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
