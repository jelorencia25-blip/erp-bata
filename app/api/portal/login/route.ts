export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { signPortalSession, PORTAL_COOKIE_NAME } from '@/lib/lib/portalSession';

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('customer_portal_users')
      .select('id, customer_id, username, password_hash, is_active, customers(name)')
      .eq('username', username)
      .maybeSingle();

    if (error || !user || !user.is_active) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const customerName = (user as any).customers?.name || 'Customer';

    const token = await signPortalSession({
      portalUserId: user.id,
      customerId: user.customer_id,
      customerName,
      username: user.username,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set(PORTAL_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return response;
  } catch (err: any) {
    console.error('PORTAL LOGIN ERROR:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}