import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, nametambahan, phone, address, credit_limit, status")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    name,
    nametambahan,
    phone,
    address,
    credit_limit,
    status,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "name wajib" }, { status: 400 });
  }

  const { error } = await supabase.from("customers").insert({
    name,
    nametambahan: nametambahan || null,
    phone: phone || null,
    address: address || null,
    credit_limit: credit_limit ?? 0,
    status: status || "active",
  });

  if (error) {
    console.error("INSERT CUSTOMER ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID wajib" }, { status: 400 });
  }

  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) {
    console.error("DELETE CUSTOMER ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
