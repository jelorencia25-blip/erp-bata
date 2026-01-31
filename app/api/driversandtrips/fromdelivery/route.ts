import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("driver_trips")
    .select(`
      id,
      trip_date,
      no_surat_jalan,
      plat_mobil,
      tujuan,
      uang_jalan,
      biaya_tambahan,
      total_uang_jalan,
      status_pembayaran,
      drivers:driver_id!left (
        name
      )
    `)
    .order("trip_date", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const result = (data ?? []).map((d: any) => ({
    id: d.id,
    trip_date: d.trip_date,
    no_surat_jalan: d.no_surat_jalan,
    plat_mobil: d.plat_mobil,
    tujuan: d.tujuan ?? "-",
    uang_jalan: Number(d.uang_jalan ?? 0),
    biaya_tambahan: Number(d.biaya_tambahan ?? 0),
    total_uang_jalan: Number(d.total_uang_jalan ?? 0),
    status_pembayaran: d.status_pembayaran ?? "unpaid",
    driver_name: d.drivers?.name ?? "(driver belum sinkron)",
  }));

  return NextResponse.json(result);
}
