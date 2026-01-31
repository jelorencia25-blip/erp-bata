"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type InvoiceRow = {
  id: string;
  sj_number: string;
  delivery_date: string;
  sales_order?: {
    customer?: {
      name: string;
    } | null;
  } | null;
};

export default function InvoicesPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const router = useRouter();

  /* ================= FETCH ================= */
  useEffect(() => {
    fetch("/api/invoices")
      .then((res) => res.json())
      .then((data) => {
        setRows(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  /* ================= FILTER ================= */
  const filteredRows = useMemo(() => {
    if (!filter) return rows;

    return rows.filter((r) =>
      r.sales_order?.customer?.name
        ?.toLowerCase()
        .includes(filter.toLowerCase())
    );
  }, [rows, filter]);

  if (loading)
    return <div className="p-6 text-gray-500">Loading invoices...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <h1 className="text-3xl font-bold">Invoices</h1>

      {/* OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Invoice" value={filteredRows.length} />
      </div>

      {/* FILTER */}
      <input
        type="text"
        placeholder="Filter Customer / Supplier"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="border rounded-lg px-4 py-2 w-full md:w-1/3 focus:ring-2 focus:ring-blue-300"
      />

      {/* TABLE */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700 uppercase">
            <tr>
              {["No", "No SJ", "Customer", "Tanggal", "Action"].map((h) => (
                <th key={h} className="p-3 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400">
                  Tidak ada invoice
                </td>
              </tr>
            ) : (
              filteredRows.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3 font-medium">{r.sj_number}</td>
                  <td className="p-3">
                    {r.sales_order?.customer?.name ?? "-"}
                  </td>
                  <td className="p-3">
                    {r.delivery_date
                      ? new Date(r.delivery_date).toLocaleDateString("id-ID")
                      : "-"}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => router.push(`/invoices/${r.id}`)}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                    >
                      Lihat Invoice
                    </button>
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

/* ================= SMALL COMPONENT ================= */

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="p-5 rounded-lg shadow bg-gray-50">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
