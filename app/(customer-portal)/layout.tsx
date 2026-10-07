import { cookies } from 'next/headers';
import { verifyPortalSession, PORTAL_COOKIE_NAME } from '@/lib/lib/portalSession';

export default async function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE_NAME)?.value;
  const session = token ? await verifyPortalSession(token) : null;

  return (
    <html lang="id">
      <body className="bg-gray-50 min-h-screen">
        {session ? <PortalNav customerName={session.customerName} /> : null}
        <main>{children}</main>
      </body>
    </html>
  );
}

function PortalNav({ customerName }: { customerName: string }) {
  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">Selamat datang,</p>
          <p className="text-xl font-bold text-gray-800">{customerName}</p>
        </div>
        <form action="/api/portal/logout" method="POST">
          <button
            type="submit"
            className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 text-base"
          >
            Keluar
          </button>
        </form>
      </div>
    </nav>
  );
}