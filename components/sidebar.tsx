'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SIDEBAR_ACCESS, UserRole } from './sidebarAccess';

/* =====================
   NORMALIZE ROLE
===================== */
function normalizeRole(role: unknown): UserRole | null {
  if (typeof role !== 'string') return null;

  const normalized = role.trim().toLowerCase();

  if (normalized in SIDEBAR_ACCESS) {
    return normalized as UserRole;
  }

  return null;
}

type MenuItem =
  | { label: string; href: string }
  | { divider: true };

const menus: MenuItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Raw Orders', href: '/raworders' },
  { label: 'Sales Orders', href: '/salesorders' },
  { label: 'Deliveries', href: '/deliveries' },
  { label: 'Invoices', href: '/invoices' },
  { label: 'Returns', href: '/returns' },
  { label: 'Payments', href: '/payments' },
  { label: 'Deposits', href: '/deposits' },

  { divider: true },

  { label: 'Drivers & Trips', href: '/driversandtrips' },
  { label: 'Vehicles', href: '/vehicles' },

  { divider: true },

  { label: 'Products', href: '/products' },
  { label: 'Suppliers', href: '/suppliers' },
  { label: 'Staffs Management', href: '/staffsmanagement' },

  { divider: true },

  { label: 'Finance', href: '/finance' },
  { label: 'Reports', href: '/reports' },
  { label: 'Audits', href: '/audits' },
];

export default function Sidebar() {
  const pathname = usePathname();

  // DEFAULT AMAN
  const [role, setRole] = useState<UserRole>('operator');

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return;

    try {
      const user = JSON.parse(raw);
      const normalizedRole = normalizeRole(user.role);

      if (normalizedRole) {
        setRole(normalizedRole);
      }
    } catch (err) {
      console.error('Sidebar parse error:', err);
    }
  }, []);

  const allowedMenus = SIDEBAR_ACCESS[role];

  const filteredMenus = menus.filter(menu => {
    if ('divider' in menu) return true;
    return allowedMenus.includes(menu.label);
  });

  return (
    <aside className="sticky top-0 h-screen w-64 bg-[#195AAF] text-white flex flex-col">
   

      {/* LOGO */}
<div className="flex items-center h-20 px-10 border-b border-white/10">
  <img
    src="/logo.png"
    alt="ERP Logo"
    className="h-20 w-auto object-contain"
  />
</div>

      {/* MENU */}
      <nav className="flex-1 overflow-y-auto py-4">
        {filteredMenus.map((menu, idx) => {
          if ('divider' in menu) {
            return (
              <div
                key={idx}
                className="my-3 mx-4 border-t border-white/10"
              />
            );
          }

          const active = pathname === menu.href;

          return (
            <Link
              key={menu.href}
              href={menu.href}
              className={`
                flex items-center px-6 py-2.5 text-sm transition-all
                ${
                  active
                    ? 'bg-white/15 border-l-4 border-white font-semibold'
                    : 'text-white/80 hover:bg-white/10'
                }
              `}
            >
              {menu.label}
            </Link>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div className="px-6 py-4 text-xs text-white/50 border-t border-white/10">
        © {new Date().getFullYear()} ERP System
      </div>
    </aside>
  );
}
