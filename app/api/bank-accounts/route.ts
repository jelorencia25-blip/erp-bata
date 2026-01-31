import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("bank_accounts")
      .select("bank_name, account_number, account_holder")
      .eq("is_active", true)
      .order("bank_name", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("Bank Accounts Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch bank accounts" },
      { status: 500 }
    );
  }
}