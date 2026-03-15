"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

type RekapRow = {
  id: string;
  order_date: string | null;
  so_number: string;
  deposit_code: string;
  sj_number: string;
  supplier: string;
  toko: string;
  ukuran: string;
  palet: number;
  harga_m3: number | null;
  jumlah_retur: number;
  tagihan: number;
  payment_date: string | null;
  status: "paid" | "unpaid";
};

type SortKey = keyof RekapRow;

const PAGE_SIZE = 50;

const fmt = (n: number | null | undefined) =>
  n == null ? "-" : "Rp " + n.toLocaleString("id-ID");

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

function useDebounce<T>(value: T, delay = 400): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

const COLS: { key: SortKey; label: string; align?: "right" | "left" }[] = [
  { key: "order_date", label: "Tgl SO" },
  { key: "so_number", label: "No SO" },
  { key: "deposit_code", label: "Kode Deposit" },
  { key: "sj_number", label: "No SJ" },
  { key: "supplier", label: "Supplier" },
  { key: "toko", label: "Toko" },
  { key: "ukuran", label: "Ukuran" },
  { key: "palet", label: "Palet", align: "right" },
  { key: "harga_m3", label: "Harga/m3", align: "right" },
  { key: "jumlah_retur", label: "Retur", align: "right" },
  { key: "tagihan", label: "Tagihan", align: "right" },
  { key: "payment_date", label: "Tgl Bayar" },
  { key: "status", label: "Status" },
];

export default function RekapPage() {
  const [rows, setRows] = useState<RekapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [sortKey, setSortKey] = useState<SortKey>("order_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const res = await fetch(`/api/rekap?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    const kw = debouncedSearch.toLowerCase();
    let result = rows;

    if (kw) {
      result = result.filter((r) =>
        [r.supplier, r.toko, r.so_number, r.sj_number, r.deposit_code, r.ukuran]
          .join(" ").toLowerCase().includes(kw)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(r => r.status === statusFilter);
    }

    result = [...result].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number")
        return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });

    return result;
  }, [rows, debouncedSearch, statusFilter, sortKey, sortDir]);

  const kpi = useMemo(() => {
    const paid = filtered.filter(r => r.status === "paid");
    const unpaid = filtered.filter(r => r.status === "unpaid");
    return {
      total: filtered.length,
      totalTagihan: filtered.reduce((s, r) => s + r.tagihan, 0),
      paidCount: paid.length,
      paidAmount: paid.reduce((s, r) => s + r.tagihan, 0),
      unpaidCount: unpaid.length,
      unpaidAmount: unpaid.reduce((s, r) => s + r.tagihan, 0),
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const exportExcel = () => {
    const headers = ["No", ...COLS.map(c => c.label)];
    const csvRows = [
      headers.join(","),
      ...filtered.map((r, i) => [
        i + 1,
        fmtDate(r.order_date),
        r.so_number,
        r.deposit_code,
        r.sj_number,
        r.supplier,
        r.toko,
        r.ukuran,
        r.palet || 0,
        r.harga_m3 ?? "",
        r.jumlah_retur || 0,
        r.tagihan,
        fmtDate(r.payment_date),
        r.status,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekap-pengiriman-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span className="ml-1 opacity-60">
      {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  return (
    <div className="min-h-screen bg-[#f5f4f0] font-mono">

      {/* HEADER */}
      <div className="bg-[#1a1a1a] text-white px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-widest">Rekap Pengiriman</h1>
          <p className="text-xs text-gray-400">{filtered.length} baris</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="border px-3 py-1 text-xs hover:bg-gray-700">
            ⬇ Export Excel
          </button>
          <button onClick={fetchData} className="border px-3 py-1 text-xs hover:bg-gray-700">
            Refresh
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 bg-white border-b">
        <KpiCard label="Total SJ" value={String(kpi.total)} />
        <KpiCard label="Total Tagihan" value={fmt(kpi.totalTagihan)} />
        <KpiCard label={`Paid (${kpi.paidCount})`} value={fmt(kpi.paidAmount)} color="green" />
        <KpiCard label={`Unpaid (${kpi.unpaidCount})`} value={fmt(kpi.unpaidAmount)} color="red" />
      </div>

      {/* FILTER */}
      <div className="bg-white border-b px-6 py-3 flex gap-2 flex-wrap items-center">
        <input
          placeholder="Cari supplier, toko, SO, SJ..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border px-3 py-1 text-sm w-64"
        />
        <input type="date" value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border px-3 py-1 text-sm" />
        <input type="date" value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border px-3 py-1 text-sm" />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
          className="border px-3 py-1 text-sm">
          <option value="all">Semua Status</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <button
          onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setStatusFilter("all"); setPage(1); }}
          className="border px-3 py-1 text-xs hover:bg-gray-100">
          Reset
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading...</div>
        ) : error ? (
          <div className="p-10 text-center text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Tidak ada data</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-black text-white uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2 text-left">No</th>
                {COLS.map(c => (
                  <th
                    key={c.key}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-800 select-none text-${c.align ?? "left"}`}
                    onClick={() => handleSort(c.key)}>
                    {c.label}<SortIcon k={c.key} />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {paginated.map((r, i) => (
                <tr key={r.id}
                  className={`border-b ${r.status === "paid" ? "bg-green-50 hover:bg-green-100" : "bg-red-50 hover:bg-red-100"}`}>
                  <td className="px-3 py-2">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.order_date)}</td>
                  <td className="px-3 py-2 font-semibold">{r.so_number}</td>
                  <td className="px-3 py-2">{r.deposit_code}</td>
                  <td className="px-3 py-2">{r.sj_number}</td>
                  <td className="px-3 py-2">{r.supplier}</td>
                  <td className="px-3 py-2">{r.toko}</td>
                  <td className="px-3 py-2">{r.ukuran}</td>
                  <td className="px-3 py-2 text-right">{r.palet || "-"}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.harga_m3)}</td>
                  <td className="px-3 py-2 text-right">{r.jumlah_retur || "-"}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmt(r.tagihan)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.payment_date)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      r.status === "paid"
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-red-100 text-red-700 border border-red-300"
                    }`}>
                      {r.status === "paid" ? "PAID" : "UNPAID"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot className="bg-black text-white text-[10px]">
              <tr>
                <td colSpan={12} className="px-3 py-2 text-right">Total</td>
                <td className="px-3 py-2 text-right font-bold">{fmt(kpi.totalTagihan)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* PAGINATION */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white border-t px-6 py-3 flex items-center justify-between text-xs">
          <span className="text-gray-500">
            Halaman {page} dari {totalPages} · {filtered.length} baris
          </span>
          <div className="flex gap-1">
            <PBtn onClick={() => setPage(1)} disabled={page === 1} label="«" />
            <PBtn onClick={() => setPage(p => p - 1)} disabled={page === 1} label="‹ Prev" />
            {getPages(page, totalPages).map((p, i) =>
              p === "..."
                ? <span key={`e${i}`} className="px-2 py-1 text-gray-400">...</span>
                : <PBtn key={`p${p}`} onClick={() => setPage(Number(p))} active={page === p} label={String(p)} />
            )}
            <PBtn onClick={() => setPage(p => p + 1)} disabled={page === totalPages} label="Next ›" />
            <PBtn onClick={() => setPage(totalPages)} disabled={page === totalPages} label="»" />
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color?: "green" | "red" }) {
  const bg = color === "green" ? "bg-green-50 text-green-700" : color === "red" ? "bg-red-50 text-red-700" : "";
  return (
    <div className={`px-6 py-4 border-r last:border-r-0 ${bg}`}>
      <div className="text-[10px] text-gray-500 uppercase mb-1">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function PBtn({ onClick, disabled, active, label }: { onClick: () => void; disabled?: boolean; active?: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-2 py-1 rounded text-xs font-medium ${
        active ? "bg-black text-white" : disabled ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-100"
      }`}>
      {label}
    </button>
  );
}

function getPages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}