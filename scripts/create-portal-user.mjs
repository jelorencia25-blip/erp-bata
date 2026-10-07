import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline/promises';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function main() {
  const customerName = await rl.question('Nama customer (persis seperti di tabel customers): ');
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('id, name')
    .ilike('name', customerName)
    .maybeSingle();

  if (custErr || !customer) {
    console.error('Customer tidak ditemukan:', custErr?.message || 'no match');
    process.exit(1);
  }

  console.log(`Ditemukan: ${customer.name} (${customer.id})`);

  const username = await rl.question('Username untuk login: ');
  const password = await rl.question('Password: ');
  const maxOpenSO = await rl.question('Max open SO (default 10): ');

  const password_hash = await bcrypt.hash(password, 10);

  const { error: insertErr } = await supabase.from('customer_portal_users').insert({
    customer_id: customer.id,
    username,
    password_hash,
    max_open_so: maxOpenSO ? parseInt(maxOpenSO) : 10,
  });

  if (insertErr) {
    console.error('Gagal insert:', insertErr.message);
    process.exit(1);
  }

  console.log(`✅ Akun untuk ${customer.name} berhasil dibuat. Username: ${username}`);
  process.exit(0);
}

main();