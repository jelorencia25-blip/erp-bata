'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/lib/supabase';


type ReportRow = {
  id: number;
  type: string;
  count: number;
  total_value: number;
};

export default function ReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);

  useEffect(() => {
    async function fetchReports() {
      const reports: ReportRow[] = [];

      // Sales Orders
      const { data: so } = await supabase
        .from('sales_orders')
        .select('id, total_price');

      const soTotal: number = so?.reduce(
        (acc: number, i: { total_price?: number }) => acc + (i.total_price ?? 0),
        0
      ) ?? 0;

      reports.push({
        id: 1,
        type: 'Sales Orders',
        count: so?.length ?? 0,
        total_value: soTotal,
      });

      // Deliveries
      const { data: del } = await supabase
        .from('deliveries')
        .select('id, total_price');

      const delTotal: number = del?.reduce(
        (acc: number, i: { total_price?: number }) => acc + (i.total_price ?? 0),
        0
      ) ?? 0;

      reports.push({
        id: 2,
        type: 'Deliveries',
        count: del?.length ?? 0,
        total_value: delTotal,
      });

      // Invoices
      const { data: inv } = await supabase
        .from('invoices')
        .select('id, total');

      const invTotal: number = inv?.reduce(
        (acc: number, i: { total?: number }) => acc + (i.total ?? 0),
        0
      ) ?? 0;

      reports.push({
        id: 3,
        type: 'Invoices',
        count: inv?.length ?? 0,
        total_value: invTotal,
      });

      // Returns
      const { data: ret } = await supabase
        .from('returns')
        .select('id, total_price');

      const retTotal: number = ret?.reduce(
        (acc: number, i: { total_price?: number }) => acc + (i.total_price ?? 0),
        0
      ) ?? 0;

      reports.push({
        id: 4,
        type: 'Returns',
        count: ret?.length ?? 0,
        total_value: retTotal,
      });

      setRows(reports);
    }

    fetchReports();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reports</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-left border border-white/10">
          <thead className="bg-white/10">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Count</th>
              <th className="px-4 py-2">Total Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="px-4 py-2">{r.id}</td>
                <td className="px-4 py-2">{r.type}</td>
                <td className="px-4 py-2">{r.count}</td>
                <td className="px-4 py-2">Rp {r.total_value.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
