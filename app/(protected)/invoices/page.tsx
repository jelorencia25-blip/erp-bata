"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type InvoiceRow = {
  id: string;
  sj_number: string;
  delivery_date: string;
  sudah_tagih: boolean;
  sudah_bayar: boolean;
  so_number: string | null;
  customer_name: string | null;
  deposit_code: string | null;
};

const PAGE_SIZE = 100;

export default function InvoicesPage() {
  const router = useRouter();

  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [soFilter, setSoFilter] = useState("");
  const [debouncedSoFilter, setDebouncedSoFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tagihFilter, setTagihFilter] = useState<"all" | "yes" | "no">("all");
  const [bayarFilter, setBayarFilter] = useState<"all" | "yes" | "no">("all");

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSoFilter(soFilter); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [soFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        tagih: tagihFilter,
        bayar: bayarFilter,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (debouncedSoFilter) params.set("so", debouncedSoFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/invoices?${params.toString()}`);
      const json = await res.json();
      setRows(Array.isArray(json.data) ? json.data : []);
      setTotal(json.total ?? 0);
    } catch (err: any) {
      setError(err.message ?? "Gagal memuat data");
      setRows([]);
      setTotal(0);
    }
    setLoading(false);
  }, [page, debouncedSearch, debouncedSoFilter, dateFrom, dateTo, tagihFilter, bayarFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateDateFrom = (v: string) => { setDateFrom(v); setPage(1); };
  const updateDateTo = (v: string) => { setDateTo(v); setPage(1); };
  const updateTagih = (v: "all" | "yes" | "no") => { setTagihFilter(v); setPage(1); };
  const updateBayar = (v: "all" | "yes" | "no") => { setBayarFilter(v); setPage(1); };

  const updateCheckbox = async (id: string, field: "sudah_tagih" | "sudah_bayar", value: boolean) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));

    await fetch(`/api/delivery-status/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });

    fetchData(); // resync Total Invoice & filter eligibility
  };

  const resetFilter = () => {
    setSearch(""); setSoFilter(""); setDateFrom(""); setDateTo("");
    setTagihFilter("all"); setBayarFilter("all"); setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Invoices</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Invoice" value={total} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <input type="text" placeholder="Cari Supplier / No SJ / Deposit" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-300" />

        <input type="text" placeholder="Filter No SO" value={soFilter}
          onChange={(e) => setSoFilter(e.target.value)}
          className="border rounded-lg px-4 py-2" />

        <input type="date" value={dateFrom} onChange={(e) => updateDateFrom(e.target.value)} className="border rounded-lg px-4 py-2" />
        <input type="date" value={dateTo} onChange={(e) => updateDateTo(e.target.value)} className="border rounded-lg px-4 py-2" />

        <select value={tagihFilter} onChange={(e) => updateTagih(e.target.value as any)} className="border rounded-lg px-4 py-2">
          <option value="all">Semua Tagih</option>
          <option value="yes">Sudah Tagih</option>
          <option value="no">Belum Tagih</option>
        </select>

        <select value={bayarFilter} onChange={(e) => updateBayar(e.target.value as any)} className="border rounded-lg px-4 py-2">
          <option value="all">Semua Bayar</option>
          <option value="yes">Sudah Bayar</option>
          <option value="no">Belum Bayar</option>
        </select>

        <button onClick={resetFilter} className="bg-gray-200 hover:bg-gray-300 rounded-lg px-4 py-2 text-sm font-medium md:col-span-6">
          Reset Filter
        </button>
      </div>

      <div className="text-sm text-red-600 font-semibold">⚠ Jangan lupa update di payment</div>

      {loading && <div className="text-gray-500">Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700 uppercase">
            <tr>
              {["No", "No SO", "No SJ", "Deposit Code", "Supplier", "Tanggal", "Sudah Tagih", "Sudah Bayar", "Action"].map((h) => (
                <th key={h} className="p-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr><td colSpan={9} className="p-6 text-center text-gray-400">Tidak ada invoice</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id} className="border-b hover:bg-gray-50 transition">
                  <td className="p-3">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="p-3 font-medium">{r.so_number ?? "-"}</td>
                  <td className="p-3 font-medium">{r.sj_number}</td>
                  <td className="p-3 text-sm text-gray-600">{r.deposit_code ?? "-"}</td>
                  <td className="p-3">{r.customer_name ?? "-"}</td>
                  <td className="p-3">{r.delivery_date ? new Date(r.delivery_date).toLocaleDateString("id-ID") : "-"}</td>
                  <td className="p-3 text-center">
                    <input type="checkbox" checked={!!r.sudah_tagih} onChange={(e) => updateCheckbox(r.id, "sudah_tagih", e.target.checked)} />
                  </td>
                  <td className="p-3 text-center">
                    <input type="checkbox" checked={!!r.sudah_bayar} onChange={(e) => updateCheckbox(r.id, "sudah_bayar", e.target.checked)} />
                  </td>
                  <td className="p-3">
                    <button onClick={() => router.push(`/invoices/${r.id}`)} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold">
                      Lihat Invoice
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">Halaman {page} dari {totalPages}</span>
        <div className="flex gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded bg-gray-100 disabled:text-gray-300">‹ Prev</button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded bg-gray-100 disabled:text-gray-300">Next ›</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="p-5 rounded-lg shadow bg-gray-50">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}