"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Row = {
  id: string;
  delivery_date: string;
  no_gudang?: string | null;
  sj_number: string;
  so_number: string;
  pelanggan: string;
  kepada: string;
  alamat: string;
  ukuran: string;
  total_pcs: number;
  palet: number;
  total_m3: number;
  return_pcs?: number;
  supir: string;
  plat_mobil: string;
  final_status: "draft" | "final";
};

type SortKey = keyof Row;
type SortDir = "asc" | "desc";

const PAGE_SIZE = 100;

export default function DeliveriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab") as "pending" | "processed" | null;
  const [tab, setTab] = useState<"pending" | "processed">(tabParam ?? "processed");

  // ===== PENDING TAB: client-side fetch-all + filter (unchanged) =====
  const [pendingData, setPendingData] = useState<Row[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingFilterSO, setPendingFilterSO] = useState("");
  const [pendingSortKey, setPendingSortKey] = useState<SortKey>("so_number");
  const [pendingSortDir, setPendingSortDir] = useState<SortDir>("desc");

  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await fetch("/api/deliveries/pending");
      const json = await res.json();
      const cleaned = Array.isArray(json) ? json.filter((r: any) => r.so_status !== "cancelled") : [];
      setPendingData(cleaned);
    } catch {
      setPendingData([]);
    }
    setPendingLoading(false);
  }, []);

  const pendingFilteredSorted = useMemo(() => {
    const kw = pendingSearch.toLowerCase();
    let filtered = pendingData.filter(row =>
      (row.sj_number?.toLowerCase().includes(kw) ||
        row.pelanggan?.toLowerCase().includes(kw) ||
        row.kepada?.toLowerCase().includes(kw) ||
        row.supir?.toLowerCase().includes(kw) ||
        row.plat_mobil?.toLowerCase().includes(kw)) &&
      (pendingFilterSO === "" || row.so_number?.toLowerCase().includes(pendingFilterSO.toLowerCase()))
    );

    filtered = [...filtered].sort((a: any, b: any) => {
      const aVal = a[pendingSortKey], bVal = b[pendingSortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return pendingSortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return pendingSortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return filtered;
  }, [pendingData, pendingSearch, pendingFilterSO, pendingSortKey, pendingSortDir]);

  // ===== PROCESSED TAB: server-side paginated + filtered =====
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterSO, setFilterSO] = useState("");
  const [debouncedFilterSO, setDebouncedFilterSO] = useState("");
  const [filterAction, setFilterAction] = useState<"all" | "done" | "final">("all");
  const [sortKey, setSortKey] = useState<SortKey>("delivery_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [confirmRow, setConfirmRow] = useState<Row | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilterSO(filterSO), 300);
    return () => clearTimeout(t);
  }, [filterSO]);

  const fetchProcessed = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sortBy: sortKey,
        sortDir,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (debouncedFilterSO) params.set("so", debouncedFilterSO);
      if (filterAction !== "all") params.set("action", filterAction);

      const res = await fetch(`/api/deliveries/processed?${params.toString()}`);
      const json = await res.json();
      setRows(Array.isArray(json.data) ? json.data : []);
      setTotal(json.total ?? 0);
    } catch {
      setRows([]);
      setTotal(0);
    }
    setLoading(false);
  }, [page, sortKey, sortDir, debouncedSearch, debouncedFilterSO, filterAction]);

  // tab switch: handle URL + pending fetch
  useEffect(() => {
    router.replace(`/deliveries?tab=${tab}`);
    if (tab === "pending") fetchPending();
  }, [tab]);

  // single source of truth for processed tab fetching
  useEffect(() => {
    if (tab === "processed") fetchProcessed();
  }, [tab, page, sortKey, sortDir, debouncedSearch, debouncedFilterSO, filterAction]);

  const toggleSort = (key: SortKey, isPending: boolean) => {
    if (isPending) {
      if (pendingSortKey === key) setPendingSortDir(pendingSortDir === "asc" ? "desc" : "asc");
      else { setPendingSortKey(key); setPendingSortDir("asc"); }
    } else {
      if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
      else { setSortKey(key); setSortDir("asc"); }
      setPage(1);
    }
  };

  const activeSortKey = tab === "pending" ? pendingSortKey : sortKey;
  const activeSortDir = tab === "pending" ? pendingSortDir : sortDir;

  const SortTh = ({ label, col, align = "left" }: { label: string; col: SortKey; align?: "left" | "center" | "right" }) => (
    <th onClick={() => toggleSort(col, tab === "pending")} className={`p-3 cursor-pointer select-none text-${align}`}>
      {label}
      {activeSortKey === col && (activeSortDir === "asc" ? " ▲" : " ▼")}
    </th>
  );

  const displayRows = tab === "pending" ? pendingFilteredSorted : rows;
  const isLoading = tab === "pending" ? pendingLoading : loading;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Deliveries</h1>
          <p className="text-gray-500">Assign Surat Jalan & Monitoring Pengiriman</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab("pending")} className={`px-4 py-2 rounded ${tab === "pending" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
            Belum Diproses
          </button>
          <button onClick={() => setTab("processed")} className={`px-4 py-2 rounded ${tab === "processed" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
            Sudah Diproses
          </button>
        </div>
      </div>

      {tab === "pending" ? (
        <div className="bg-white rounded shadow p-4 mb-4 border-l-4 border-blue-500 w-fit">
          <p className="text-gray-500 text-sm">Total SJ Belum Diproses</p>
          <p className="text-2xl font-bold">{pendingData.length}</p>
        </div>
      ) : (
        <div className="text-sm text-gray-500 mb-4">
          Menampilkan {rows.length} dari {total} hasil
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input
          value={tab === "pending" ? pendingSearch : search}
          onChange={e => {
            if (tab === "pending") setPendingSearch(e.target.value);
            else { setSearch(e.target.value); setPage(1); }
          }}
          placeholder="Cari No SJ, Supplier, Kepada, Supir, Plat..."
          className="border rounded px-3 py-2 text-sm"
        />
        <input
          value={tab === "pending" ? pendingFilterSO : filterSO}
          onChange={e => {
            if (tab === "pending") setPendingFilterSO(e.target.value);
            else { setFilterSO(e.target.value); setPage(1); }
          }}
          placeholder="Filter No SO..."
          className="border rounded px-3 py-2 text-sm"
        />
        {tab === "processed" && (
          <select
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value as any); setPage(1); }}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">Semua Status</option>
            <option value="done">DONE (Belum Final)</option>
            <option value="final">FINAL</option>
          </select>
        )}
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 text-center w-20">Action</th>
              <SortTh label="Tgl Delivery" col="delivery_date" />
              <SortTh label="No Gudang" col="no_gudang" />
              <SortTh label="No SJ" col="sj_number" />
              <SortTh label="No SO" col="so_number" />
              <SortTh label="Supplier" col="pelanggan" />
              <SortTh label="Kepada" col="kepada" />
              <SortTh label="Alamat" col="alamat" />
              <SortTh label="Uk" col="ukuran" align="center" />
              <SortTh label="PCS" col="total_pcs" align="right" />
              <SortTh label="Palet" col="palet" align="center" />
              <SortTh label="M3" col="total_m3" align="right" />
              <SortTh label="Return PCS" col="return_pcs" align="right" />
              <SortTh label="Supir" col="supir" />
              <SortTh label="Plat" col="plat_mobil" />
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={16} className="p-4 text-center">Loading...</td></tr>
            )}
            {!isLoading && displayRows.length === 0 && (
              <tr><td colSpan={16} className="p-4 text-center">Tidak ada data</td></tr>
            )}
            {!isLoading && displayRows.map(row => (
              <tr key={row.id} className={`border-t ${row.final_status === "final" ? "bg-green-100" : tab === "processed" ? "bg-yellow-100" : ""}`}>
                <td className="p-3 text-center">
                  {tab === "processed" && (row.final_status === "draft" ? (
                    <button onClick={() => setConfirmRow(row)} className="bg-green-600 text-white px-3 py-1 rounded text-xs">DONE</button>
                  ) : (
                    <span className="text-green-600 font-semibold text-xs">FINAL</span>
                  ))}
                </td>
                <td className="p-3">{row.delivery_date ? new Date(row.delivery_date + "T00:00:00").toLocaleDateString("id-ID") : "-"}</td>
                <td className="p-3">{row.no_gudang ?? "-"}</td>
                <td className="p-3">{row.sj_number}</td>
                <td className="p-3">{row.so_number}</td>
                <td className="p-3">{row.pelanggan}</td>
                <td className="p-3">{row.kepada}</td>
                <td className="p-3">{row.alamat}</td>
                <td className="p-3 text-center">{row.ukuran}</td>
                <td className="p-3 text-right">{row.total_pcs?.toLocaleString()}</td>
                <td className="p-3 text-center">{row.palet}</td>
                <td className="p-3 text-right">{row.total_m3?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-3 text-right">{row.return_pcs ?? 0}</td>
                <td className="p-3">{row.supir}</td>
                <td className="p-3">{row.plat_mobil}</td>
                <td className="p-3 text-right">
                  {tab === "pending" && (
                    <button onClick={() => router.push(`/deliveries/assign/${row.id}`)} className="bg-blue-600 text-white px-4 py-1 rounded">Assign</button>
                  )}
                  {tab === "processed" && (
                    <button onClick={() => router.push(`/deliveries/processed/${row.id}`)} className="border px-4 py-1 rounded">Detail</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tab === "processed" && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">Halaman {page} dari {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded bg-gray-100 disabled:text-gray-300">‹ Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded bg-gray-100 disabled:text-gray-300">Next ›</button>
          </div>
        </div>
      )}

      {confirmRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setConfirmRow(null)}>
          <div className="bg-white rounded-lg p-6 w-96" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2 text-red-600">Finalisasi Delivery</h2>
            <p className="text-sm mb-3">Delivery ini akan <b>dikunci</b> dan tidak bisa diubah lagi.</p>
            <ul className="text-sm mb-4 space-y-1">
              <li><b>SJ:</b> {confirmRow.sj_number}</li>
              <li><b>SO:</b> {confirmRow.so_number}</li>
              <li><b>Pelanggan:</b> {confirmRow.pelanggan}</li>
              <li><b>Total PCS:</b> {confirmRow.total_pcs}</li>
              <li><b>Palet:</b> {confirmRow.palet}</li>
            </ul>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" disabled={submitting} onClick={() => setConfirmRow(null)}>Batal</button>
              <button
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  await fetch("/api/deliveries/finalize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ delivery_order_id: confirmRow.id }),
                  });
                  setRows(prev => prev.map(r => r.id === confirmRow.id ? { ...r, final_status: "final" } : r));
                  setSubmitting(false);
                  setConfirmRow(null);
                }}
              >
                Ya, Finalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}