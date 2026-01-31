"use client";

import { useEffect, useState } from "react";

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
  kubik_m3: string;
  supir: string;
  plat_mobil: string;
};

export default function DeliveriesProcessedPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

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
    </div>
  );
}
