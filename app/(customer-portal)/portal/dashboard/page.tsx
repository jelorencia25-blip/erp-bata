import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyPortalSession, PORTAL_COOKIE_NAME } from '@/lib/lib/portalSession';

export default async function PortalDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE_NAME)?.value;
  const session = token ? await verifyPortalSession(token) : null;

  if (!session) {
    redirect('/portal/login');
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 uppercase font-semibold">Pesanan Berjalan</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">— / —</p>
          <p className="text-xs text-gray-400 mt-1">Segera hadir</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-orange-500">
          <p className="text-sm text-gray-500 uppercase font-semibold">Belum Lunas</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">—</p>
          <p className="text-xs text-gray-400 mt-1">Segera hadir</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-500 uppercase font-semibold">Sisa Kuota Order</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">—</p>
          <p className="text-xs text-gray-400 mt-1">Segera hadir</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
        <p className="text-lg">Fitur riwayat pesanan dan buat order baru sedang dalam pengembangan.</p>
      </div>
    </div>
  );
}