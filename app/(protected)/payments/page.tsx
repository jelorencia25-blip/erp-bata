"use client";

import { useEffect, useMemo, useState } from "react";

type PaymentRow = {
  no: number;
  delivery_order_id: string;
  no_sj: string;
  tgl: string | null;
  deposit_code: string | null;
  supplier: string;
  ref_supplier: string;
  kepada: string;
  total_tagihan: number;
  overdue: number;
  status: "paid" | "unpaid";
};

export default function PaymentsPage() {
  const [data, setData] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    const res = await fetch("/api/payments");
    const json = await res.json();
    setData(Array.isArray(json) ? json : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= UPDATE STATUS ================= */
  const updateStatus = async (delivery_order_id: string, status: "paid" | "unpaid") => {
    await fetch("/api/payments/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delivery_order_id, status }),
    });
    fetchData();
  };

  /* ================= FILTER DATA ================= */
  const filteredData = useMemo(() => {
    return data.filter((d) => {
      const keyword = search.toLowerCase();
      const matchSearch =
  !keyword ||
  d.no_sj.toLowerCase().includes(keyword) ||
  d.supplier.toLowerCase().includes(keyword) ||
  d.deposit_code?.toLowerCase().includes(keyword);


      const rowDate = d.tgl ? new Date(d.tgl).setHours(0, 0, 0, 0) : null;
      const from = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
      const to = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;

      const matchDate =
        (!from || (rowDate && rowDate >= from)) &&
        (!to || (rowDate && rowDate <= to));

      return matchSearch && matchDate;
    });
  }, [data, search, dateFrom, dateTo]);

  /* ================= OVERVIEW ================= */
  const overview = useMemo(() => {
    const total = filteredData.length;
    const paid = filteredData.filter(d => d.status === "paid").length;
    const unpaid = filteredData.filter(d => d.status === "unpaid").length;
    const overdue = filteredData.filter(d => d.status === "unpaid" && d.overdue > 5).length;
    const unpaidAmount = filteredData
      .filter(d => d.status === "unpaid")
      .reduce((sum, d) => sum + (d.total_tagihan ?? 0), 0);

    return { total, paid, unpaid, overdue, unpaidAmount };
  }, [filteredData]);

  if (loading)
    return <div className="p-6 text-gray-500">Loading payments...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <h1 className="text-3xl font-bold">Payments</h1>

      {/* OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard title="Total DO" value={overview.total} />
        <StatCard title="DO Dibayar" value={overview.paid} color="green" />
        <StatCard title="DO Belum Dibayar" value={overview.unpaid} color="red" />
        <StatCard title="Overdue > 5 Hari" value={overview.overdue} color="orange" />
        <StatCard title="Total Unpaid (Rp)" value={overview.unpaidAmount} color="red" isCurrency />
      </div>

      {/* FILTER */}
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Cari No SJ / Nama Supplier / Kode Deposit"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-4 py-2 w-full md:w-1/3 focus:ring-2 focus:ring-blue-300"
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
          onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
          className="bg-gray-200 hover:bg-gray-300 rounded px-4 py-2"
        >
          Reset Filter
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700 uppercase">
            <tr>
              {["No", "Kode Deposit", "No SJ","Tgl","Supplier","Ref Supplier","Kepada","Total Tagihan","Overdue","Status"].map((h) => (
                <th key={h} className="p-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-400">
                  Tidak ada data
                </td>
              </tr>
            ) : (
              filteredData.map((row, i) => (
                <tr
                  key={row.delivery_order_id}
                  className={`border-b ${
                    row.status === "paid"
                      ? "bg-green-200 text-green-900"
                      : "bg-red-200 text-red-900"
                  } hover:${row.status === "paid" ? "bg-green-300" : "bg-red-300"} transition-colors duration-150`}
                >
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3 font-medium">
                  {row.deposit_code ?? "-"}
                </td>
                  <td className="p-3 font-medium">{row.no_sj}</td>
                  <td className="p-3">{row.tgl ? new Date(row.tgl).toLocaleDateString("id-ID") : "-"}</td>
                  <td className="p-3">{row.supplier}</td>
                  <td className="p-3">{row.ref_supplier}</td>
                  <td className="p-3">{row.kepada}</td>
                  <td className="p-3 text-right font-semibold">
                    Rp {row.total_tagihan.toLocaleString("id-ID")}
                  </td>
                  <td className="p-3 text-center">{row.overdue > 0 ? row.overdue : "-"}</td>
                  <td className="p-3">
                    <select
                      value={row.status}
                      onChange={(e) =>
                        updateStatus(
                          row.delivery_order_id,
                          e.target.value as "paid" | "unpaid"
                        )
                      }
                      className={`px-3 py-1 rounded-full text-xs font-semibold
                        ${row.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                        }`}
                    >
                      <option value="unpaid">UNPAID</option>
                      <option value="paid">PAID</option>
                    </select>
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

/* ================= STAT CARD ================= */
function StatCard({
  title,
  value,
  color,
  isCurrency,
}: {
  title: string;
  value: number;
  color?: "green" | "red" | "orange";
  isCurrency?: boolean;
}) {
  const colorMap = {
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    orange: "bg-orange-50 text-orange-700",
  };

  return (
    <div
      className={`p-5 rounded-lg shadow ${
        color ? colorMap[color] : "bg-gray-50"
      }`}
    >
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold">
        {isCurrency
          ? `Rp ${value.toLocaleString("id-ID")}`
          : value}
      </div>
    </div>
  );
}