export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ================= GET (LOAD PAGE) ================= */
export async function GET() {
  try {
    const { data: deliveries, error: deliveryError } = await supabase
      .from("delivery_orders")
      .select(`
        id,
        created_at,
        sj_number,
        driver_id,
        vehicle_id,
        staff:staff!delivery_orders_driver_id_fkey ( name ),
        vehicles ( plate_number ),
        sales_orders ( ship_to_name, delivery_address )
      `)
      .order("created_at", { ascending: false });

    if (deliveryError) {
      console.error("Delivery fetch error:", deliveryError);
      return NextResponse.json(
        { error: deliveryError.message },
        { status: 500 }
      );
    }

    const { data: trips, error: tripError } = await supabase
      .from("driver_trips")
      .select("*");

    if (tripError) {
      console.error("Trips fetch error:", tripError);
      return NextResponse.json({ error: tripError.message }, { status: 500 });
    }

    const tripsMap = new Map();
    (trips ?? []).forEach((trip: any) => {
      tripsMap.set(trip.delivery_order_id, trip);
    });

    const rows = (deliveries ?? []).map((d: any) => {
      const trip = tripsMap.get(d.id);

      return {
        id: d.id,
        tanggal: d.created_at,
        driver: d.staff?.name ?? "-",
        surat_jalan: d.sj_number ?? "-",
        plat: d.vehicles?.plate_number ?? "-",
        alamat:
          d.sales_orders?.delivery_address ??
          d.sales_orders?.ship_to_name ??
          "-",
        uang_jalan: trip?.uang_jalan ?? 0,
        tambahan: trip?.biaya_tambahan ?? 0,
        total: trip?.total_uang_jalan ?? 0,
        bayar: trip?.status_pembayaran ?? "unpaid",
        bukti_transfer_url: trip?.bukti_transfer_url ?? null,
      };
    });

    return NextResponse.json(rows);
  } catch (e) {
    console.error("GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ================= POST (SAVE ROW) ================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      id,
      uang_jalan,
      biaya_tambahan,
      status_pembayaran,
      bukti_transfer_url,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID wajib" }, { status: 400 });
    }

    const uangJalanNum = Number(uang_jalan) || 0;
    const biayaTambahanNum = Number(biaya_tambahan) || 0;

    const { error } = await supabase
      .from("driver_trips")
      .upsert(
        {
          delivery_order_id: id,
          uang_jalan: uangJalanNum,
          biaya_tambahan: biayaTambahanNum,
          status_pembayaran: status_pembayaran || "unpaid",
          bukti_transfer_url: bukti_transfer_url || null,
        },
        {
          onConflict: "delivery_order_id",
        }
      );

    if (error) {
      console.error("Save error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}