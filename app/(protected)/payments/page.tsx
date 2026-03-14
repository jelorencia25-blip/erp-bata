"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";

type PaymentRow = {
  no: number;
  so_number: string | null;
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

const PAGE_SIZE = 50;

export default function PaymentsPage() {
  const allData = useRef<PaymentRow[]>([]);
  const [data, setData] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [sortKey, setSortKey] = useState<keyof PaymentRow | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/payments");
    const json = await res.json();
    const rows: PaymentRow[] = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : []);
    allData.current = rows;
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (key: keyof PaymentRow) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  // Apply filter + paginate whenever data or filters change
  useEffect(() => {
    if (allData.current.length === 0 && !loading) return;
    applyFilter(1);
  }, [loading, search, dateFrom, dateTo, statusFilter, sortKey, sortDir]);

  useEffect(() => {
    applyFilter(currentPage);
  }, [currentPage]);

  const applyFilter = (page: number) => {
    let filtered = allData.current;

    if (search) {
      const kw = search.toLowerCase();
      filtered = filtered.filter(d =>
        d.no_sj.toLowerCase().includes(kw) ||
        d.supplier.toLowerCase().includes(kw) ||
        d.deposit_code?.toLowerCase().includes(kw)
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom).setHours(0,0,0,0);
      filtered = filtered.filter(d => d.tgl && new Date(d.tgl).setHours(0,0,0,0) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo).setHours(23,59,59,999);
      filtered = filtered.filter(d => d.tgl && new Date(d.tgl).getTime() <= to);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    if (sortKey) {
      filtered = [...filtered].sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];

        if (va == null) return 1;
        if (vb == null) return -1;

        if (typeof va === "number" && typeof vb === "number") {
          return sortDir === "asc" ? va - vb : vb - va;
        }

        return sortDir === "asc"
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
    }

    setTotalRows(filtered.length);

    const start = (page - 1) * PAGE_SIZE;

    setData(
      filtered
        .slice(start, start + PAGE_SIZE)
        .map((r, i) => ({ ...r, no: start + i + 1 }))
    );
  };

  // KPI dari semua data (tidak dipengaruhi filter)
  const overview = useMemo(() => {
    const all = allData.current;

    const paid = all.filter(d => d.status === "paid").length;
    const unpaid = all.filter(d => d.status === "unpaid").length;
    const overdue = all.filter(d => d.status === "unpaid" && d.overdue > 5).length;

    const unpaidAmount = all
      .filter(d => d.status === "unpaid")
      .reduce((s, d) => s + (d.total_tagihan ?? 0), 0);

    return { total: all.length, paid, unpaid, overdue, unpaidAmount };
  }, [allData.current]);

  const updateStatus = async (delivery_order_id: string, status: "paid" | "unpaid") => {
    allData.current = allData.current.map(r =>
      r.delivery_order_id === delivery_order_id ? { ...r, status } : r
    );
    applyFilter(currentPage);

    await fetch("/api/payments/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delivery_order_id, status }),
    });
  };

  const resetFilter = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  if (loading) return <div className="p-6 text-gray-500">Loading payments...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Payments</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard title="Total DO" value={overview.total} />
        <StatCard title="DO Dibayar" value={overview.paid} color="green" />
        <StatCard title="DO Belum Dibayar" value={overview.unpaid} color="red" />
        <StatCard title="Overdue > 5 Hari" value={overview.overdue} color="orange" />
        <StatCard title="Total Unpaid (Rp)" value={overview.unpaidAmount} color="red" isCurrency />
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <input type="text" placeholder="Cari No SJ / Nama Supplier / Kode Deposit"
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          className="border rounded-lg px-4 py-2 w-full md:w-1/3 focus:ring-2 focus:ring-blue-300" />

        <input type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
          className="border rounded-lg px-4 py-2" />

        <input type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
          className="border rounded-lg px-4 py-2" />

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
          className="border rounded-lg px-4 py-2">
          <option value="all">Semua Status</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>

        <button onClick={resetFilter}
          className="bg-gray-200 hover:bg-gray-300 rounded px-4 py-2">
          Reset Filter
        </button>
      </div>

      <div className="text-sm text-gray-500">
        Menampilkan {data.length} dari {totalRows} hasil · Total DO: {overview.total}
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700 uppercase">
            <tr>
              <th className="p-3 cursor-pointer" onClick={()=>handleSort("no")}>No</th>
              <th className="p-3 cursor-pointer" onClick={()=>handleSort("so_number")}>No SO</th>
              <th className="p-3 cursor-pointer" onClick={()=>handleSort("deposit_code")}>Kode Deposit</th>
              <th className="p-3 cursor-pointer" onClick={()=>handleSort("no_sj")}>No SJ</th>
              <th className="p-3 cursor-pointer" onClick={()=>handleSort("tgl")}>Tgl</th>
              <th className="p-3 cursor-pointer" onClick={()=>handleSort("supplier")}>Supplier</th>
              <th className="p-3 cursor-pointer" onClick={()=>handleSort("ref_supplier")}>Ref Supplier</th>
              <th className="p-3 cursor-pointer" onClick={()=>handleSort("kepada")}>Kepada</th>
              <th className="p-3 cursor-pointer" onClick={()=>handleSort("total_tagihan")}>Total Tagihan</th>
              <th className="p-3 cursor-pointer" onClick={()=>handleSort("overdue")}>Overdue</th>
              <th className="p-3 cursor-pointer" onClick={()=>handleSort("status")}>Status</th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-6 text-center text-gray-400">
                  Tidak ada data
                </td>
              </tr>
            ) : data.map((row, i) => (
              <tr key={row.delivery_order_id}
                className={`border-b ${row.status === "paid"
                  ? "bg-green-50 text-green-900 hover:bg-green-100"
                  : "bg-red-50 text-red-900 hover:bg-red-100"}`}>

                <td className="p-3">{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                <td className="p-3 font-medium">{row.so_number ?? "-"}</td>
                <td className="p-3">{row.deposit_code ?? "-"}</td>
                <td className="p-3 font-medium">{row.no_sj}</td>
                <td className="p-3 whitespace-nowrap">
                  {row.tgl ? new Date(row.tgl).toLocaleDateString("id-ID") : "-"}
                </td>
                <td className="p-3">{row.supplier}</td>
                <td className="p-3">{row.ref_supplier}</td>
                <td className="p-3">{row.kepada}</td>

                <td className="p-3 text-right font-semibold whitespace-nowrap">
                  Rp {(row.total_tagihan ?? 0).toLocaleString("id-ID")}
                </td>

                <td className="p-3 text-center">
                  {row.overdue > 0
                    ? <span className={row.overdue > 5 ? "text-orange-600 font-bold" : ""}>
                        {row.overdue}
                      </span>
                    : "-"}
                </td>

                <td className="p-3">
                  <select
                    value={row.status}
                    onChange={e => updateStatus(row.delivery_order_id, e.target.value as "paid" | "unpaid")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${
                      row.status === "paid"
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-red-100 text-red-700 border border-red-300"
                    }`}>
                    <option value="unpaid">UNPAID</option>
                    <option value="paid">PAID</option>
                  </select>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Halaman {currentPage} dari {totalPages}
        </span>

        <div className="flex gap-1 flex-wrap">
          <PBtn onClick={() => setCurrentPage(1)} disabled={currentPage === 1} label="«" />
          <PBtn onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} label="‹ Prev" />

          {getPages(currentPage, totalPages).map((p, i) =>
            p === "..."
              ? <span key={`e${i}`} className="px-3 py-1 text-gray-400">...</span>
              : <PBtn key={`p${p}`} onClick={() => setCurrentPage(Number(p))} active={currentPage === p} label={String(p)} />
          )}

          <PBtn onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} label="Next ›" />
          <PBtn onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} label="»" />
        </div>
      </div>
    </div>
  );
}

function getPages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current-1); i <= Math.min(total-1, current+1); i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

function PBtn({ onClick, disabled, active, label }: { onClick: () => void; disabled?: boolean; active?: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : disabled
          ? "bg-gray-100 text-gray-300 cursor-not-allowed"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}>
      {label}
    </button>
  );
}

function StatCard({ title, value, color, isCurrency }: { title: string; value: number; color?: "green"|"red"|"orange"; isCurrency?: boolean }) {
  const colorMap = {
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    orange: "bg-orange-50 text-orange-700"
  };

  return (
    <div className={`p-5 rounded-lg shadow ${color ? colorMap[color] : "bg-gray-50"}`}>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold">
        {isCurrency ? `Rp ${value.toLocaleString("id-ID")}` : value}
      </div>
    </div>
  );
}
