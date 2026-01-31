export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ======================
   GET STAFF
====================== */
export async function GET() {
  const { data, error } = await supabase
    .from("staff")
    .select("id, name, posisi, level, phone, email, address, salary, status")
    .order("name");

  if (error) {
    console.error("GET STAFF ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/* ======================
   ADD STAFF
====================== */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, posisi, level, phone, email, address, salary, status } = body;

    if (!name || !posisi) {
      return NextResponse.json({ error: "Name dan Posisi wajib diisi" }, { status: 400 });
    }

    const { error } = await supabase.from("staff").insert({
      name,
      posisi,
      level: level || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      salary: salary?.toString().trim() ? Number(salary) : null,
      status: status || "active",
    });

    if (error) {
      console.error("INSERT STAFF ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ======================
   UPDATE STAFF
====================== */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

    const { error } = await supabase.from("staff").update({
      ...data,
      salary: data.salary?.toString().trim() ? Number(data.salary) : null,
      level: data.level || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
    }).eq("id", id);

    if (error) {
      console.error("UPDATE STAFF ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ======================
   DELETE STAFF
====================== */
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

    const { error } = await supabase.from("staff").delete().eq("id", id);

    if (error) {
      console.error("DELETE STAFF ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
