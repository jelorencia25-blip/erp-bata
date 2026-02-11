"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type InvoiceRow = {
  id: string;
  sj_number: string;
  delivery_date: string;
  sudah_tagih: boolean;
  sudah_bayar: boolean;
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

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  /* ================= FETCH ================= */
  useEffect(() => {
    fetch("/api/invoices")
      .then((res) => res.json())
      .then((data) => {
        setRows(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const updateCheckbox = async (
  id: string,
  field: "sudah_tagih" | "sudah_bayar",
  value: boolean
) => {
  setRows(prev =>
    prev.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    )
  );

  await fetch(`/api/delivery-status/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [field]: value }),
  });
};


  /* ================= FILTER ================= */
  const filteredRows = useMemo(() => {
  return rows.filter((r) => {
    // 🔎 Search: customer name / SJ
    const keyword = search.toLowerCase();
    const matchSearch =
      !keyword ||
      r.sj_number?.toLowerCase().includes(keyword) ||
      r.sales_order?.customer?.name
        ?.toLowerCase()
        .includes(keyword);

    // 📅 Date filter
    const rowDate = r.delivery_date
      ? new Date(r.delivery_date).setHours(0, 0, 0, 0)
      : null;

    const fromDate = dateFrom
      ? new Date(dateFrom).setHours(0, 0, 0, 0)
      : null;

    const toDate = dateTo
      ? new Date(dateTo).setHours(23, 59, 59, 999)
      : null;

    const matchDate =
      (!fromDate || (rowDate && rowDate >= fromDate)) &&
      (!toDate || (rowDate && rowDate <= toDate));

    return matchSearch && matchDate;
  });
}, [rows, search, dateFrom, dateTo]);

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
<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
  <input
    type="text"
    placeholder="Cari Supplier / No SJ"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-300"
  />

  <input
    type="date"
    value={dateFrom}
    onChange={(e) => setDateFrom(e.target.value)}
    className="border rounded-lg px-4 py-2"
  />

  <input
    type="date"
    value={dateTo}
    onChange={(e) => setDateTo(e.target.value)}
    className="border rounded-lg px-4 py-2"
  />

  <button
    onClick={() => {
      setSearch("");
      setDateFrom("");
      setDateTo("");
    }}
    className="bg-gray-200 hover:bg-gray-300 rounded-lg px-4 py-2 text-sm font-medium"
  >
    Reset Filter
  </button>
</div>

<div className="text-sm text-red-600 font-semibold">
  ⚠ Jangan lupa update di payment
</div>


      {/* TABLE */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700 uppercase">
            <tr>
              {["No", "No SJ", "Supplier", "Tanggal", "Sudah Tagih", "Sudah Bayar", "Action"].map((h) => (
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
                  <td className="p-3 text-center">
  <input
    type="checkbox"
    checked={!!r.sudah_tagih}

    onChange={(e) =>
      updateCheckbox(r.id, "sudah_tagih", e.target.checked)
    }
  />
</td>

<td className="p-3 text-center">
  <input
    type="checkbox"
    checked={!!r.sudah_bayar}
    onChange={(e) =>
      updateCheckbox(r.id, "sudah_bayar", e.target.checked)
    }
  />
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
