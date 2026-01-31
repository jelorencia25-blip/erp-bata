
export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ======================
   GET PRODUCTS
====================== */
export async function GET() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");

  if (error) {
    console.error("GET PRODUCTS ERROR:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

/* ======================
   ADD PRODUCT
====================== */
export async function POST(req: Request) {
  const body = await req.json();

  const {
    name,
    thickness_cm,
    pallet_m3,
    pcs_per_pallet,
    default_price_per_m3,
  } = body;

  if (!name || default_price_per_m3 == null) {
    return NextResponse.json(
      { error: "name & default_price_per_m3 wajib" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("products")
    .insert({
      name,
      thickness_cm,
      pallet_m3,
      pcs_per_pallet,
      default_price_per_m3,
    });

  if (error) {
    console.error("INSERT PRODUCT ERROR:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

/* ======================
   UPDATE PRODUCT
====================== */
export async function PUT(req: Request) {
  const body = await req.json();
  const { id, ...data } = body;

  if (!id) {
    return NextResponse.json(
      { error: "ID wajib" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("products")
    .update(data)
    .eq("id", id);

  if (error) {
    console.error("UPDATE PRODUCT ERROR:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

/* ======================
   DELETE PRODUCT
====================== */
export async function DELETE(req: Request) {
  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json(
      { error: "ID wajib" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("DELETE PRODUCT ERROR:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
