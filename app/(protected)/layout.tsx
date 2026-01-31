export const dynamic = 'force-dynamic'
export const dynamicParams = true

// ... rest of your existing code stays the same

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';


export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.replace('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, []);

  if (!user) return null;
return (
  <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f7fb' }}>
    <Sidebar />

    <div style={{ flex: 1 }}>
      {/* TOP BAR */}
      <div
        style={{
          padding: '16px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* LEFT */}
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#111827' }}>
            Selamat Datang Kembali, {user.username} !
          </div>
          <div style={{ fontSize: 16, color: '#6b7280', marginTop: 4 }}>
            Hari ini {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </div>
        </div>

        {/* RIGHT */}
        <button
          onClick={() => {
            localStorage.removeItem('user');
            router.replace('/login');
          }}
          style={{
            background: '#fee2e2',
            color: '#b91c1c',
            border: 'none',
            padding: '10px 16px',
            borderRadius: 8,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
           Logout
        </button>
      </div>

      {/* PAGE CONTENT */}
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  </div>
);

}


