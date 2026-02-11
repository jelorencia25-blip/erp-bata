"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Row = {
  id: string;
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

export default function DeliveriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab") as "pending" | "processed" | null;
  const [tab, setTab] = useState<"pending" | "processed">(tabParam ?? "pending");

  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const [confirmRow, setConfirmRow] = useState<Row | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // SEARCH
  const [search, setSearch] = useState("");

  // SORT
  const [sortKey, setSortKey] = useState<SortKey>("so_number");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // FETCH
  const fetchData = async (activeTab: "pending" | "processed") => {
  setLoading(true);

  const url =
    activeTab === "pending"
      ? "/api/deliveries/pending"
      : "/api/deliveries/processed";

  try {
    const res = await fetch(url);
    const json = await res.json();

    const cleaned = Array.isArray(json)
      ? json.filter(row => row.so_status !== "cancelled")
      : [];

    setData(cleaned);
  } catch {
    setData([]);
  }

  setLoading(false);
};

  useEffect(() => {
    fetchData(tab);
    router.replace(`/deliveries?tab=${tab}`);
  }, [tab]);

  // OVERVIEW
  const overview = useMemo(() => {
    const total = data.length;
    const finalCount = data.filter(d => d.final_status === "final").length;
    const draftCount = total - finalCount;

    return { total, final: finalCount, draft: draftCount };
  }, [data]);

  // FILTER + SORT
  const filteredAndSortedData = useMemo(() => {
    const keyword = search.toLowerCase();

    const filtered = data.filter(row =>
      row.sj_number?.toLowerCase().includes(keyword) ||
      row.pelanggan?.toLowerCase().includes(keyword) ||
      row.kepada?.toLowerCase().includes(keyword) ||
      row.supir?.toLowerCase().includes(keyword) ||
      row.plat_mobil?.toLowerCase().includes(keyword)
    );

    const sorted = [...filtered];

    sorted.sort((a: any, b: any) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return sorted;
  }, [data, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortTh = ({
    label,
    col,
    align = "left",
  }: {
    label: string;
    col: SortKey;
    align?: "left" | "center" | "right";
  }) => (
    <th
      onClick={() => toggleSort(col)}
      className={`p-3 cursor-pointer select-none text-${align}`}
    >
      {label}
      {sortKey === col && (sortDir === "asc" ? " ▲" : " ▼")}
    </th>
  );

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Deliveries</h1>
          <p className="text-gray-500">
            Assign Surat Jalan & Monitoring Pengiriman
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTab("pending")}
            className={`px-4 py-2 rounded ${
              tab === "pending" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Belum Diproses
          </button>

          <button
            onClick={() => setTab("processed")}
            className={`px-4 py-2 rounded ${
              tab === "processed" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Sudah Diproses
          </button>
        </div>
      </div>

     {/* OVERVIEW */}
<div className="grid grid-cols-3 gap-4 mb-4">
  <div className="bg-white rounded shadow p-4 border-l-4 border-blue-500">
    <p className="text-gray-500 text-sm">Total SJ</p>
    <p className="text-2xl font-bold">{overview.total}</p>
  </div>

  <div className="bg-yellow-100 rounded shadow p-4 border-l-4 border-yellow-500">
    <p className="text-yellow-700 text-sm">Belum Final</p>
    <p className="text-2xl font-bold">{overview.draft}</p>
  </div>

  <div className="bg-green-100 rounded shadow p-4 border-l-4 border-green-500">
    <p className="text-green-700 text-sm">Sudah Final</p>
    <p className="text-2xl font-bold">{overview.final}</p>
  </div>
</div>

      {/* SEARCH */}
      <div className="mb-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari No SJ, Supplier, Kepada, Supir, Plat..."
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 text-center w-20">Action</th>
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
            {loading && (
              <tr>
                <td colSpan={12} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && filteredAndSortedData.length === 0 && (
              <tr>
                <td colSpan={12} className="p-4 text-center">
                  Tidak ada data
                </td>
              </tr>
            )}

            {filteredAndSortedData.map(row => (
              <tr key={row.id} className="border-t">
                <td className="p-3 text-center">
                  {tab === "processed" &&
                    (row.final_status === "draft" ? (
                      <button
                        onClick={() => setConfirmRow(row)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs"
                      >
                        DONE
                      </button>
                    ) : (
                      <span className="text-green-600 font-semibold text-xs">
                        FINAL
                      </span>
                    ))}
                </td>

                <td className="p-3">{row.sj_number}</td>
                <td className="p-3">{row.so_number}</td>
                <td className="p-3">{row.pelanggan}</td>
                <td className="p-3">{row.kepada}</td>
                <td className="p-3">{row.alamat}</td>
                <td className="p-3 text-center">{row.ukuran}</td>
                <td className="p-3 text-right">
                  {row.total_pcs.toLocaleString()}
                </td>
                <td className="p-3 text-center">{row.palet}</td>
               <td className="p-3 text-right">
  {row.total_m3?.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}
</td>
<td className="p-3 text-right">
  {row.return_pcs ?? 0}
</td>

                <td className="p-3">{row.supir}</td>
                <td className="p-3">{row.plat_mobil}</td>

                <td className="p-3 text-right">
                  {tab === "pending" && (
                    <button
                      onClick={() =>
                        router.push(`/deliveries/assign/${row.id}`)
                      }
                      className="bg-blue-600 text-white px-4 py-1 rounded"
                    >
                      Assign
                    </button>
                  )}

                  {tab === "processed" && (
                    <button
                      onClick={() =>
                        router.push(`/deliveries/processed/${row.id}`)
                      }
                      className="border px-4 py-1 rounded"
                    >
                      Detail
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
{/* MODAL CONFIRMATION */}
      {confirmRow && (
        <div 
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setConfirmRow(null)}
        >
          <div 
            className="bg-white rounded-lg p-6 w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-2 text-red-600">
              Finalisasi Delivery
            </h2>

            <p className="text-sm mb-3">
              Delivery ini akan <b>dikunci</b> dan tidak bisa diubah lagi.
            </p>

            <ul className="text-sm mb-4 space-y-1">
              <li><b>SJ:</b> {confirmRow.sj_number}</li>
              <li><b>SO:</b> {confirmRow.so_number}</li>
              <li><b>Pelanggan:</b> {confirmRow.pelanggan}</li>
              <li><b>Total PCS:</b> {confirmRow.total_pcs}</li>
              <li><b>Palet:</b> {confirmRow.palet}</li>
            </ul>

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 border rounded"
                disabled={submitting}
                onClick={() => setConfirmRow(null)}
              >
                Batal
              </button>

              <button
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);

                  await fetch("/api/deliveries/finalize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      delivery_order_id: confirmRow.id,
                    }),
                  });

                  // Update local state
                  setData(prev =>
                    prev.map(r =>
                      r.id === confirmRow.id
                        ? { ...r, final_status: "final" }
                        : r
                    )
                  );

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