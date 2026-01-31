"use client";

import { useEffect, useState } from "react";

export default function SalesOrderDetailView({ data }: any) {
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (!form) return <div>Loading...</div>;

  const formatDate = (dateStr: string | null) =>
    dateStr
      ? new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID")
      : "-";

  const totalAll =
    form.sales_order_items?.reduce(
      (sum: number, i: any) => sum + (i.total_price ?? 0),
      0
    ) ?? 0;

  const hargaSatuan = (item: any) =>
    item.total_pcs ? item.total_price / item.total_pcs : 0;

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Sales Order Detail</h2>

      {/* HEADER */}
      <div className="grid grid-cols-3 gap-6 mb-6 text-sm">
        <div>
          <div className="font-semibold text-gray-500">No SO</div>
          <div>{form.so_number}</div>
        </div>

        <div>
          <div className="font-semibold text-gray-500">Tanggal</div>
          <div>{formatDate(form.order_date)}</div>
        </div>

        <div>
          <div className="font-semibold text-gray-500">Customer Ref</div>
          <div>{form.customer_order_ref ?? "-"}</div>
        </div>

        <div>
          <div className="font-semibold text-gray-500">Kepada</div>
          <div>{form.ship_to_name ?? "-"}</div>
        </div>

        <div>
          <div className="font-semibold text-gray-500">Nomor Telp</div>
          <div>{form.contact_phone ?? "Tidak tersedia"}</div>
        </div>

        <div>
          <div className="font-semibold text-gray-500">Alamat</div>
          <div>{form.delivery_address ?? "Tidak tersedia"}</div>
        </div>
      </div>

      {/* TABLE */}
      <table className="w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">No</th>
            <th className="border p-2">Produk</th>
            <th className="border p-2">Palet</th>
            <th className="border p-2">PCS</th>
            <th className="border p-2">Harga Satuan</th>
            <th className="border p-2">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {form.sales_order_items?.map((i: any, idx: number) => (
            <tr key={i.id} className="even:bg-gray-50">
              <td className="border p-2">{idx + 1}</td>
              <td className="border p-2">{i.products?.name}</td>
              <td className="border p-2">{i.pallet_qty}</td>
              <td className="border p-2">{i.total_pcs}</td>
              <td className="border p-2">
                Rp {hargaSatuan(i).toLocaleString()}
              </td>
              <td className="border p-2">
                Rp {i.total_price.toLocaleString()}
              </td>
            </tr>
          ))}
          <tr className="font-bold border-t">
            <td colSpan={4} className="text-right p-2">
              TOTAL :
            </td>
            <td colSpan={2} className="p-2">
              Rp {totalAll.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      <button
        onClick={() => window.print()}
        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Print
      </button>
    </div>
  );
}
