"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  final_status: "draft" | "final";
  sj_number: string;
  so_number: string;
  pelanggan: string;
  kepada: string;
  alamat: string;
  ukuran: string;
  total_pcs: number;
  palet: number;
  kubik_m3: string;
  supir: string;
  plat_mobil: string;
};

export default function DeliveriesProcessedPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [confirmRow, setConfirmRow] = useState<Row | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/deliveries/processed")
      .then(res => res.json())
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Delivery Processed</h1>

      <table className="w-full border border-gray-300">
        <thead className="bg-gray-800 text-white">
          <tr>
            <th className="p-2">Action</th>
            <th className="p-2">No</th>
            <th className="p-2">SJ</th>
            <th className="p-2">SO</th>
            <th className="p-2">Pelanggan</th>
            <th className="p-2">Ukuran</th>
            <th className="p-2">PCS</th>
            <th className="p-2">Palet</th>
            <th className="p-2">Kubik (m³ / palet)</th>
            <th className="p-2">Supir</th>
            <th className="p-2">Plat</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className="border-t">
              <td className="p-2 text-center">
              {row.final_status === "draft" ? (
                <button
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  onClick={() => setConfirmRow(row)}
                >
                  DONE
                </button>
              ) : (
                <span className="text-green-600 font-semibold">FINAL</span>
              )}
            </td>
              <td className="p-2 text-center">{i + 1}</td>
              <td className="p-2">{row.sj_number}</td>
              <td className="p-2">{row.so_number}</td>
              <td className="p-2">{row.pelanggan}</td>
              <td className="p-2">{row.ukuran}</td>
              <td className="p-2 text-center">{row.total_pcs}</td>
              <td className="p-2 text-center">{row.palet}</td>
              <td className="p-2 text-center">
                {row.kubik_m3 || "-"}
              </td>
              <td className="p-2">{row.supir}</td>
              <td className="p-2">{row.plat_mobil}</td>
            </tr>
          ))}
        </tbody>
      </table>

          {confirmRow && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-105">
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

            setRows(prev =>
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
