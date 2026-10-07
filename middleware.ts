import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyPortalSession, PORTAL_COOKIE_NAME } from '@/lib/lib/portalSession';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Halaman login sendiri harus tetap bisa diakses tanpa session
  if (pathname === '/portal/login') {
    return NextResponse.next();
  }

  const token = request.cookies.get(PORTAL_COOKIE_NAME)?.value;
  const session = token ? await verifyPortalSession(token) : null;

  if (!session) {
    const loginUrl = new URL('/portal/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Middleware ini HANYA berlaku untuk path /portal/*.
  // Sengaja tidak menyentuh /deliveries, /deposits, dll (area admin)
  // sama sekali, jadi tidak ada risiko mengganggu auth admin yang sudah ada.
  matcher: ['/portal/:path*'],
};