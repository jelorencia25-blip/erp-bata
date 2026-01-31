export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET list all vehicles
export async function GET() {
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, plate_number, type, max_pallet, status")
    .order("plate_number");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

// POST add new vehicle
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { plate_number, type, max_pallet, status } = body;

  if (!plate_number)
    return NextResponse.json({ error: "plate_number wajib" }, { status: 400 });

  const { error } = await supabase.from("vehicles").insert({
    plate_number,
    type,
    max_pallet,
    status: status || "active",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
