export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { PORTAL_COOKIE_NAME } from '@/lib/lib/portalSession';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(PORTAL_COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return response;
}