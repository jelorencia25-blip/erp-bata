"use client";

import { useState } from "react";

type Item = {
  product_name: string;
  harga_m3: number;
  isi_palet: number;
  palet: number;
  pcs: number;
  harga_satuan: number;
  jumlah: number;
};

type SalesOrder = {
  id : string;
  no_so: string;
  tanggal: string;
  customer: string;
  order_ref: string;
  kepada: string;
  telp: string;
  alamat: string;
  items: Item[];
  total: number;
};


type Props = {
  mode: "view" | "edit";
  data: any;
};

export default function SalesOrderForm({ data }: Props) {
  // default = VIEW
  
  const [editable, setEditable] = useState(false);
  
  const isView = !editable;
  const handleSave = async () => {
  try {
    const res = await fetch(`/api/salesorders/${data.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result?.error || "Gagal update Sales Order");
    }

    alert("Sales Order berhasil diupdate");
    setEditable(false);
  } catch (err: any) {
    alert(err.message);
  }
};


  const [form, setForm] = useState<SalesOrder>(data);

  const update = (field: keyof SalesOrder, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => history.back()}
            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            ←
          </button>

          <h2 className="text-xl font-semibold">Sales Order Details</h2>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Print
          </button>

          {!editable ? (
            <button
              onClick={() => setEditable(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Edit
            </button>
          ) : (
            <button
  onClick={handleSave}
  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
>
  Save
</button>

          )}
        </div>
      </div>

      {/* FORM HEADER */}


{data ? (
  <div className="grid grid-cols-3 gap-6 mb-6 text-sm">
    <div>
      <div className="font-semibold text-gray-500">Nomor SO</div>
      <div>{data.so_number}</div>
    </div>

  <div>
  <div className="font-semibold text-gray-500">Tanggal</div>
  <div>
    {data?.order_date
      ? data.order_date.split("-").reverse().join("/")
      : "-"}
  </div>
</div>



    <div>
      <div className="font-semibold text-gray-500">Customer Ref</div>
      <div>{data.customer_order_ref}</div>
    </div>

    <div>
      <div className="font-semibold text-gray-500">Kepada</div>
      <div>{data.ship_to_name}</div>
    </div>

    <div>
      <div className="font-semibold text-gray-500">Nomor Telp</div>
      <div>{data.contact_phone ?? "Tidak tersedia"}</div>
    </div>

    <div>
      <div className="font-semibold text-gray-500">Alamat</div>
      <div>{data.delivery_address ?? "Tidak tersedia"}</div>
    </div>
  </div>
) : (
  <div>Loading...</div>
)}




      {/* DETAIL BARANG */}
      <table className="w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">No</th>
            <th className="border p-2">Produk</th>
            <th className="border p-2">Harga / m3</th>
            <th className="border p-2">Isi / Palet</th>
            <th className="border p-2">Palet</th>
            <th className="border p-2">PCS</th>
            <th className="border p-2">Harga Satuan</th>
            <th className="border p-2">Jumlah</th>
          </tr>
        </thead>

        <tbody>
          {form.items.map((item, i) => (
            <tr key={i} className="even:bg-gray-50">
              <td className="border p-2">{i + 1}</td>
              <td className="border p-2">{item.product_name}</td>
              <td className="border p-2">{item.harga_m3}</td>
              <td className="border p-2">{item.isi_palet}</td>
              <td className="border p-2">{item.palet}</td>
              <td className="border p-2">{item.pcs}</td>
              <td className="border p-2">
                Rp {item.harga_satuan.toLocaleString()}
              </td>
              <td className="border p-2">
                Rp {item.jumlah.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTAL */}
      <div className="text-right mt-4 font-bold text-lg">
        TOTAL : Rp {form.total.toLocaleString()}
      </div>
    </div>
  );
}
