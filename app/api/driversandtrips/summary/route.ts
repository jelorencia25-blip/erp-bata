export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("driver_trips")
    .select("driver_name, total_uang_jalan");

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const summary: Record<string, number> = {};

  data.forEach((d: any) => {
    const name = d.driver_name || "Unknown";
    summary[name] = (summary[name] || 0) + Number(d.total_uang_jalan || 0);
  });

  return NextResponse.json(
    Object.entries(summary).map(([driver, total]) => ({
      driver,
      total,
    }))
  );
}
