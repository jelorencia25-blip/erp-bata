"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

type RekapRow = {
  id: string;
  sj_number: string;
  delivery_date: string;
  so_id: string;
  so_number: string;
  order_date: string;
  customer_name: string;
  customer_ref: string;
  nama_toko: string;
  product_name: string | null;
  ukuran: string | null;
  harga_m3: number | null;
  palet: number | null;
  total_pcs: number | null;
  tagihan: number;
  jumlah_retur: number;
  jumlah_potongan: number | null;
  payment_date: string | null;
};

const fmt = (n: number | null | undefined, prefix = "Rp ") =>
  n == null ? "-" : prefix + n.toLocaleString("id-ID");

const fmtDate = (d: string | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "-";

function useDebounce<T>(value: T, delay = 400): T {
  const [dv, setDv] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return dv;
}

export default function RekapPage() {
  const [rows, setRows] = useState<RekapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const patchRow = async (
    id: string,
    patch: Partial<Pick<RekapRow, "payment_date">>
  ) => {
    setSaving((p) => ({ ...p, [id]: true }));

    try {
      await fetch(`/api/rekap/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
      );
    } catch (e: any) {
      alert("Gagal simpan");
    } finally {
      setSaving((p) => ({ ...p, [id]: false }));
    }
  };

  const filtered = useMemo(() => {
    const kw = debouncedSearch.toLowerCase();

    return rows.filter((r) =>
      [
        r.customer_name,
        r.nama_toko,
        r.so_number,
        r.sj_number,
        r.customer_ref,
        r.product_name,
        r.ukuran,
      ]
        .join(" ")
        .toLowerCase()
        .includes(kw)
    );
  }, [rows, debouncedSearch]);

  const uniqueSJMap = useMemo(() => {
    const m = new Map<string, RekapRow>();
    for (const r of filtered) if (!m.has(r.sj_number)) m.set(r.sj_number, r);
    return m;
  }, [filtered]);

  const totalTagihan = useMemo(
    () => [...uniqueSJMap.values()].reduce((s, r) => s + r.tagihan, 0),
    [uniqueSJMap]
  );

  return (
    <div className="min-h-screen bg-[#f5f4f0] font-mono">
      <div className="bg-[#1a1a1a] text-white px-6 py-4 flex justify-between">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-widest">
            Rekap Pengiriman
          </h1>
          <p className="text-xs text-gray-400">
            {filtered.length} baris · {uniqueSJMap.size} SJ
          </p>
        </div>

        <button
          onClick={fetchData}
          className="border px-3 py-1 text-xs hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 bg-white border-b">
        <div className="px-6 py-4">
          <div className="text-xs text-gray-500 uppercase mb-1">
            Total Tagihan
          </div>
          <div className="text-xl font-bold">{fmt(totalTagihan)}</div>
        </div>
      </div>

      <div className="bg-white border-b px-6 py-3 flex gap-2">
        <input
          placeholder="Cari..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-1 text-sm"
        />

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border px-3 py-1 text-sm"
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border px-3 py-1 text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading...</div>
        ) : error ? (
          <div className="p-10 text-center text-red-500">{error}</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-black text-white uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2">No</th>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2">Distributor</th>
                <th className="px-3 py-2">Toko</th>
                <th className="px-3 py-2">SO</th>
                <th className="px-3 py-2">SJ</th>
                <th className="px-3 py-2">Ukuran</th>
                <th className="px-3 py-2 text-right">Harga/m3</th>
                <th className="px-3 py-2 text-right">Tagihan</th>
                <th className="px-3 py-2">Retur</th>
                <th className="px-3 py-2">Tgl Bayar</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r, i) => {
                const prev = filtered[i - 1];
                const sameSJ = prev?.sj_number === r.sj_number;

                return (
                  <tr key={i} className="border-b">
                    <td className="px-3 py-2">{sameSJ ? "" : i + 1}</td>

                    <td className="px-3 py-2">
                      {sameSJ ? "" : fmtDate(r.order_date)}
                    </td>

                    <td className="px-3 py-2">
                      {sameSJ ? "" : r.customer_name}
                    </td>

                    <td className="px-3 py-2">{sameSJ ? "" : r.nama_toko}</td>

                    <td className="px-3 py-2">{sameSJ ? "" : r.so_number}</td>

                    <td className="px-3 py-2">
                      {sameSJ ? "↳" : r.sj_number}
                    </td>

                    <td className="px-3 py-2">{r.ukuran}</td>

                    <td className="px-3 py-2 text-right">
                      {fmt(r.harga_m3)}
                    </td>

                    <td className="px-3 py-2 text-right font-semibold">
                      {sameSJ ? "—" : fmt(r.tagihan)}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {r.jumlah_retur}
                    </td>

                    <td className="px-3 py-2">
                      {!sameSJ && (
                        <input
                          type="date"
                          value={r.payment_date ?? ""}
                          onChange={(e) =>
                            patchRow(r.id, {
                              payment_date: e.target.value || null,
                            })
                          }
                          className="border px-1 py-0.5 text-xs"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot className="bg-black text-white text-[10px]">
              <tr>
                <td colSpan={8} className="px-3 py-2 text-right">
                  Total
                </td>
                <td className="px-3 py-2 text-right">
                  {fmt(totalTagihan)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}