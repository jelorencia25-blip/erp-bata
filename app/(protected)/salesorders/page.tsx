'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/lib/supabase';
import Link from 'next/link';

type SalesOrder = {
  id: string;
  order_date: string;
  so_number: string | null;
  customer_order_ref: string | null;
  customer_name: string | null;
  ship_to_name: string | null;
  total_pcs: number | null;
  uk: string | null;
  total_price: number | null;
  purchase_type: string | null;
  status: string | null;
  sj_numbers?: string;
};

type Summary = {
  total_orders: number;
  total_value: number;
  total_pcs: number;
  franco_count: number;
  franco_value: number;
  locco_count: number;
  locco_value: number;
  pending_count: number;
  in_delivery_count: number;
  completed_count: number;
  cancelled_count: number;
};

const ROW_STATUS_CLASS: Record<string, string> = {
  cancelled: "bg-red-200 text-red-900 hover:bg-red-300",
  in_delivery: "bg-yellow-200 text-yellow-900 hover:bg-yellow-300",
  completed: "bg-green-200 text-green-900 hover:bg-green-300",
  pending: "bg-gray-200 text-gray-900 hover:bg-gray-300",
};

const STATUS_OPTIONS = ['pending', 'in_delivery', 'completed', 'cancelled'];
const PAGE_SIZE = 100;

function formatMoney(n: number) {
  if (!n) return "Rp 0";
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(1)}K`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    approved: 'bg-blue-100 text-blue-800',
    in_delivery: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status ? map[status] || 'bg-gray-200 text-gray-800' : 'bg-gray-200 text-gray-800'}`}>
      {status ? status.replace('_', ' ') : '-'}
    </span>
  );
}

function PurchaseBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-gray-400">-</span>;
  const isFranco = type === 'Franco';
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isFranco ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
      {type.toUpperCase()}
    </span>
  );
}

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);

  // text filters (debounced)
  const [textFilters, setTextFilters] = useState({ customer_name: '', so_number: '', sj_number: '' });
  const [debouncedTextFilters, setDebouncedTextFilters] = useState(textFilters);

  // discrete filters (applied immediately)
  const [orderDate, setOrderDate] = useState('');
  const [status, setStatus] = useState('');

  const [sortConfig, setSortConfig] = useState<{ key: keyof SalesOrder; direction: 'asc' | 'desc' }>({
    key: 'order_date',
    direction: 'desc',
  });

  // debounce text filters; reset page bersamaan saat debounce settle
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedTextFilters(textFilters);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [textFilters]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase.from('v_sales_orders_list').select('*', { count: 'exact' });

      if (debouncedTextFilters.customer_name) query = query.ilike('customer_name', `%${debouncedTextFilters.customer_name}%`);
      if (debouncedTextFilters.so_number) query = query.ilike('so_number', `%${debouncedTextFilters.so_number}%`);
      if (debouncedTextFilters.sj_number) query = query.ilike('sj_numbers', `%${debouncedTextFilters.sj_number}%`);
      if (orderDate) query = query.eq('order_date', orderDate);
      if (status) query = query.eq('status', status);

      query = query
        .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' })
        .order('id', { ascending: true })
        .range(from, to);

      const { data, error: queryError, count } = await query;
      if (queryError) throw queryError;

      setOrders(data ?? []);
      setTotal(count ?? 0);

      const { data: summaryRows, error: summaryError } = await supabase.rpc('get_so_summary', {
        p_customer_name: debouncedTextFilters.customer_name || null,
        p_so_number: debouncedTextFilters.so_number || null,
        p_sj_number: debouncedTextFilters.sj_number || null,
        p_order_date: orderDate || null,
        p_status: status || null,
      });
      if (summaryError) throw summaryError;
      setSummary(summaryRows?.[0] ?? null);

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
    setLoading(false);
  }, [page, sortConfig, debouncedTextFilters, orderDate, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateOrderDate = (value: string) => { setOrderDate(value); setPage(1); };
  const updateStatusFilter = (value: string) => { setStatus(value); setPage(1); };

  const requestSort = (key: keyof SalesOrder) => {
    setSortConfig(prev =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
    setPage(1);
  };

  const getSortIcon = (key: keyof SalesOrder) => {
    if (sortConfig.key !== key) return <span className="text-gray-400 ml-1">⇅</span>;
    return sortConfig.direction === 'asc'
      ? <span className="text-gray-600 ml-1">▲</span>
      : <span className="text-gray-600 ml-1">▼</span>;
  };

  const columns: { key: keyof SalesOrder; label: string; align?: string }[] = [
    { key: 'order_date', label: 'Tgl Order' },
    { key: 'so_number', label: 'No SO' },
    { key: 'sj_numbers', label: 'SJ' },
    { key: 'customer_order_ref', label: 'Order Ref' },
    { key: 'customer_name', label: 'Supplier' },
    { key: 'ship_to_name', label: 'Kepada' },
    { key: 'total_pcs', label: 'Total PCS', align: 'right' },
    { key: 'uk', label: 'Uk' },
    { key: 'total_price', label: 'Total Harga', align: 'right' },
    { key: 'purchase_type', label: 'Purchase' },
    { key: 'status', label: 'Status' },
  ];

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('sales_orders').update({ status: newStatus }).eq('id', id);
    if (error) {
      console.error(error);
      setError(error.message);
      return;
    }
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: newStatus } : o)));
    fetchData(); // resync KPI & in case status filter sekarang exclude row ini
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Sales Orders</h1>
        <Link href="/salesorders/add" className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition">
          + Add Sales Order
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-xs text-gray-500 uppercase font-semibold">Total SO</p>
          <p className="text-2xl font-bold text-gray-800">{summary?.total_orders ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <p className="text-xs text-gray-500 uppercase font-semibold">Total Value</p>
          <p className="text-xl font-bold text-gray-800">{formatMoney(summary?.total_value ?? 0)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-xs text-gray-500 uppercase font-semibold">Franco</p>
          <p className="text-xl font-bold text-green-700">{summary?.franco_count ?? 0} SO</p>
          <p className="text-xs text-gray-500">{formatMoney(summary?.franco_value ?? 0)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <p className="text-xs text-gray-500 uppercase font-semibold">Locco</p>
          <p className="text-xl font-bold text-orange-700">{summary?.locco_count ?? 0} SO</p>
          <p className="text-xs text-gray-500">{formatMoney(summary?.locco_value ?? 0)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-500">
          <p className="text-xs text-gray-500 uppercase font-semibold">Pending</p>
          <p className="text-2xl font-bold text-gray-700">{summary?.pending_count ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <p className="text-xs text-gray-500 uppercase font-semibold">In Delivery</p>
          <p className="text-2xl font-bold text-yellow-700">{summary?.in_delivery_count ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-600">
          <p className="text-xs text-gray-500 uppercase font-semibold">Completed</p>
          <p className="text-2xl font-bold text-green-700">{summary?.completed_count ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <p className="text-xs text-gray-500 uppercase font-semibold">Cancelled</p>
          <p className="text-2xl font-bold text-red-700">{summary?.cancelled_count ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <input
          type="text"
          placeholder="Filter Nama Supplier"
          value={textFilters.customer_name}
          onChange={(e) => setTextFilters(prev => ({ ...prev, customer_name: e.target.value }))}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <input
          type="text"
          placeholder="Filter No SO"
          value={textFilters.so_number}
          onChange={(e) => setTextFilters(prev => ({ ...prev, so_number: e.target.value }))}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <input
          type="text"
          placeholder="Filter No SJ"
          value={textFilters.sj_number}
          onChange={(e) => setTextFilters(prev => ({ ...prev, sj_number: e.target.value }))}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <input
          type="date"
          value={orderDate}
          onChange={(e) => updateOrderDate(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <select
          value={status}
          onChange={(e) => updateStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="text-sm text-gray-500 mb-2">
        Menampilkan {orders.length} dari {total} hasil
      </div>

      {loading && <div className="mb-2 text-gray-500">Loading...</div>}
      {error && <div className="mb-2 text-red-500">{error}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-gray-700 uppercase text-sm">
            <tr>
              <th className="p-3 text-left">No</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`p-3 cursor-pointer select-none ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  onClick={() => requestSort(col.key)}
                >
                  <span className="inline-flex items-center">{col.label}{getSortIcon(col.key)}</span>
                </th>
              ))}
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && !loading ? (
              <tr>
                <td colSpan={13} className="p-5 text-center text-gray-400">Belum ada sales order</td>
              </tr>
            ) : (
              orders.map((o, index) => (
                <tr
                  key={o.id}
                  className={`border-b transition ${ROW_STATUS_CLASS[o.status ?? ""] ?? "bg-white hover:bg-gray-50"}`}
                >
                  <td className="p-3 text-gray-600 font-medium">{(page - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="p-3">{o.order_date ? new Date(o.order_date).toLocaleDateString('id-ID') : '-'}</td>
                  <td className="p-3 font-medium">{o.so_number ?? '-'}</td>
                  <td className="p-3">{o.sj_numbers ?? '-'}</td>
                  <td className="p-3">{o.customer_order_ref ?? '-'}</td>
                  <td className="p-3">{o.customer_name ?? '-'}</td>
                  <td className="p-3">{o.ship_to_name ?? '-'}</td>
                  <td className="p-3 text-right">{o.total_pcs?.toLocaleString() ?? 0}</td>
                  <td className="p-3">{o.uk ?? '-'}</td>
                  <td className="p-3 text-right">{o.total_price?.toLocaleString('id-ID') ?? 0}</td>
                  <td className="p-3 text-center"><PurchaseBadge type={o.purchase_type} /></td>
                  <td className="p-3">
                    <select
                      value={o.status ?? ''}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      className={`px-2 py-1 rounded border text-sm font-semibold ${o.status ? ROW_STATUS_CLASS[o.status] : 'bg-gray-100 text-gray-800'}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <Link href={`/salesorders/${o.id}`} className="text-blue-600 hover:underline">See Details</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-gray-500">Halaman {page} dari {totalPages}</span>
        <div className="flex gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded bg-gray-100 disabled:text-gray-300">‹ Prev</button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded bg-gray-100 disabled:text-gray-300">Next ›</button>
        </div>
      </div>
    </div>
  );
}