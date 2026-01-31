'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/lib/supabase';
import Link from 'next/link';

type SalesOrder = {
  id: string;
  sales_order_id: string;
  order_date: string;
  so_number: string | null;
  customer_order_ref: string | null;
  customer_name: string | null;
  ship_to_name: string | null;
  total_pcs: number | null;
  uk: string | null;
  total_price: number | null;
  purchase_type: string | null; // 🔥 TAMBAH INI
  status: string | null;
};

const STATUS_OPTIONS = ['pending', 'approved', 'in_delivery', 'completed', 'cancelled'];

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    approved: 'bg-blue-100 text-blue-800',
    in_delivery: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };


  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        status ? map[status] || 'bg-gray-200 text-gray-800' : 'bg-gray-200 text-gray-800'
      }`}
    >
      {status ? status.replace('_', ' ') : '-'}
    </span>
  );
}


  function PurchaseBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-gray-400">-</span>;

  const isFranco = type === 'Franco';

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold
        ${isFranco
          ? 'bg-green-100 text-green-700'
          : 'bg-orange-100 text-orange-700'}
      `}
    >
      {type.toUpperCase()}
    </span>
  );
}

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    customer_name: '',
    order_date: '',
    status: '',
  });

  const [sortConfig, setSortConfig] = useState<{ key: keyof SalesOrder; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
  .from('v_sales_orders_list')
  .select('*')
  .order('order_date', { ascending: false })
  .order('so_number', { ascending: false });

      if (error) {
        console.error(error);
        setError(error.message);
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    };

    fetchOrders();
  }, []);

  // Filtered Orders
  let filteredOrders = orders.filter((o) => {
    const customerName = o.customer_name || '';
    const orderDate = o.order_date || '';
    const status = o.status || '';

    return (
      customerName.toLowerCase().includes(filters.customer_name.toLowerCase()) &&
      (filters.order_date ? orderDate.startsWith(filters.order_date) : true) &&
      (filters.status ? status.toLowerCase() === filters.status.toLowerCase() : true)
    );
  });

  // Sorting
  if (sortConfig) {
    filteredOrders = [...filteredOrders].sort((a, b) => {
      const aValue = a[sortConfig.key] ?? '';
      const bValue = b[sortConfig.key] ?? '';

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return sortConfig.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }

  const requestSort = (key: keyof SalesOrder) => {
    if (sortConfig?.key === key) {
      setSortConfig({ key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  const getSortIcon = (key: keyof SalesOrder) => {
    if (sortConfig?.key !== key) return <span className="text-gray-400 ml-1">⇅</span>;
    return sortConfig.direction === 'asc' ? (
      <span className="text-gray-600 ml-1">▲</span>
    ) : (
      <span className="text-gray-600 ml-1">▼</span>
    );
  };

  const columns: { key: keyof SalesOrder; label: string; align?: string }[] = [
    { key: 'order_date', label: 'Tgl Order' },
    { key: 'so_number', label: 'No SO' },
    { key: 'customer_order_ref', label: 'Order Ref' },
    { key: 'customer_name', label: 'Supplier' },
    { key: 'ship_to_name', label: 'Kepada' },
    { key: 'total_pcs', label: 'Total PCS', align: 'right' },
    { key: 'uk', label: 'Uk' },
    { key: 'total_price', label: 'Total Harga', align: 'right' },
    { key: 'purchase_type', label: 'Purchase' }, // 🔥 TARUH DI SINI
    { key: 'status', label: 'Status' },
  ];

  const handleStatusChange = async (id: string, newStatus: string) => {
    // Update on Supabase
    const { error } = await supabase
      .from('sales_orders')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error(error);
      setError(error.message);
      return;
    }

    // Update locally
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    );
  };

  return (
    <div className="p-6">
      {/* HEADER + BUTTON */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Sales Orders</h1>
        <Link
          href="/salesorders/add"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition"
        >
          + Add Sales Order
        </Link>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Filter Nama Supplier"
          value={filters.customer_name}
          onChange={(e) => setFilters({ ...filters, customer_name: e.target.value })}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <input
          type="date"
          placeholder="Filter Tgl Order"
          value={filters.order_date}
          onChange={(e) => setFilters({ ...filters, order_date: e.target.value })}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* INFO STATE */}
      {loading && <div className="mb-2 text-gray-500">Loading...</div>}
      {error && <div className="mb-2 text-red-500">{error}</div>}

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-gray-700 uppercase text-sm">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`p-3 cursor-pointer select-none ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  onClick={() => requestSort(col.key)}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {getSortIcon(col.key)}
                  </span>
                </th>
              ))}
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 && !loading ? (
              <tr>
                <td colSpan={10} className="p-5 text-center text-gray-400">
                  Belum ada sales order
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => (
                <tr key={o.id} className="border-b hover:bg-gray-50 transition">
                  <td className="p-3">{o.order_date ? new Date(o.order_date).toLocaleDateString('id-ID') : '-'}</td>
                  <td className="p-3 font-medium">{o.so_number ?? '-'}</td>
                  <td className="p-3">{o.customer_order_ref ?? '-'}</td>
                  <td className="p-3">{o.customer_name ?? '-'}</td>
                  <td className="p-3">{o.ship_to_name ?? '-'}</td>
                  <td className="p-3 text-right">{o.total_pcs?.toLocaleString() ?? 0}</td>
                  <td className="p-3">{o.uk ?? '-'}</td>
                  <td className="p-3 text-right">{o.total_price?.toLocaleString('id-ID') ?? 0}</td>
                  
                  <td className="p-3 text-center">
  <PurchaseBadge type={o.purchase_type} /> </td>



                  <td className="p-3">
                    <select
                      value={o.status ?? ''}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      className="px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <Link href={`/salesorders/${o.id}`} className="text-blue-600 hover:underline">
                      See Details
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
