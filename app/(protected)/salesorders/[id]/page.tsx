"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SalesOrderDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
  if (!id) return;

  fetch(`/api/salesorders/${id}`)
    .then((res) => res.json())
    .then((json) => {
      console.log("RAW API RESPONSE:", json);
      console.log("DEPOSIT INFO:", json.deposit);

      setData({
        no_so: json.so_number ?? "-",
        tanggal: json.order_date ?? "-",
        customer: json.customers?.name ?? "-",
        customer_ref: json.customer_order_ref ?? "-",
        kepada: json.ship_to_name ?? "-",
        telp: json.contact_phone ?? "-",
        alamat: json.delivery_address ?? "-",
        purchase_type: json.purchase_type ?? "-",
        notes: json.notes ?? "-",

        // ✅ FIXED: Akses deposit langsung (flat structure)
        deposit: json.deposit
          ? {
              deposit_code: json.deposit.deposit_code ?? "-",
              do_remaining: json.deposit.do_remaining ?? 0,
              deposit_amount: json.deposit.deposit_amount ?? 0,
              amount_remaining: json.deposit.amount_remaining ?? 0,
              price_lock_per_m3: json.deposit.price_lock_per_m3 ?? 0,
            }
          : null,

        items: (json.sales_order_items ?? []).map((i: any) => ({
          product_name: i.products?.name ?? "-",
          harga_m3: i.price_per_m3 ?? 0,
          kubik_m3: i.products?.kubik_m3 ?? 0,
          isi_palet: i.total_pcs && i.pallet_qty ? i.total_pcs / i.pallet_qty : 0,
          total_m3: (i.products?.kubik_m3 ?? 0) * (i.pallet_qty ?? 0),
          palet: i.pallet_qty ?? 0,
          pcs: i.total_pcs ?? 0,
          harga_satuan: i.total_pcs > 0 ? i.total_price / i.total_pcs : 0,
          jumlah: i.total_price ?? 0,
        })),
      });

      setLoading(false);
    });
}, [id]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">Data tidak ditemukan</div>;

  const total = data.items.reduce((sum: number, i: any) => sum + i.jumlah, 0);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* ACTION BAR */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => router.push("/salesorders")}
          className="text-sm text-gray-600 hover:underline"
        >
          ← Kembali
        </button>

        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          🖨 Print Nota
        </button>
      </div>

      {/* ================= PRINT AREA ================= */}
      <div id="print-area" className="bg-white p-10 rounded-lg shadow">
        {/* JUDUL */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-wide">NOTA {data.no_so}</h1>
          <p className="text-sm text-gray-500 mt-1">Tanggal: {data.tanggal}</p>
        </div>

        {/* HEADER INFO */}
        <div className="grid grid-cols-2 gap-x-16 gap-y-3 text-sm mb-10">
          <Info label="Nomor SO" value={data.no_so} />
          <Info label="Tanggal SO" value={data.tanggal} />
          <Info label="Nama Pelanggan" value={data.customer} />
          <Info label="Nomor Ref Pelanggan" value={data.customer_ref} />
          <Info label="Kepada" value={data.kepada} />
          <Info label="Nomor Telp" value={data.telp} />
          <Info label="Jenis Pembelian" value={data.purchase_type} />
          <Info label="Catatan" value={data.notes || "-"} />
          <Info 
            label="Kode Deposit" 
            value={data.deposit?.deposit_code ?? "-"} 
          />
          <Info label = "Alamat" value = {data.alamat} />

    
        </div>

        {/* TABLE DETAIL BARANG */}
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="py-3 px-2">No</th>
              <th className="py-3 px-2 text-left">Produk</th>
              <th className="py-3 px-2">Harga / m³</th>
              <th className="py-3 px-2">Isi / Palet</th>
              <th className="py-3 px-2">M³ / Palet</th>
              <th className="py-3 px-2">Palet</th>
              <th className="py-3 px-2">PCS</th>
              <th className="py-3 px-2">Harga Satuan</th>
              <th className="py-3 px-2">Jumlah</th>
            </tr>
          </thead>

          <tbody>
            {data.items.map((i: any, idx: number) => (
              <tr key={idx} className="border-b even:bg-gray-50">
                <td className="text-center py-2">{idx + 1}</td>
                <td className="py-2">{i.product_name}</td>
                <td className="text-right py-2">Rp {i.harga_m3.toLocaleString()}</td>
                <td className="text-center py-2">{i.isi_palet}</td>
                <td className="text-center py-2">{i.total_m3} m³</td>
                <td className="text-center py-2">{i.palet}</td>
                <td className="text-center py-2">{i.pcs}</td>
                <td className="text-right py-2">
                  Rp {i.harga_satuan.toLocaleString()}
                </td>
                <td className="text-right py-2 font-medium">
                  Rp {i.jumlah.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTAL */}
        <div className="flex justify-end mt-8">
          <div className="w-1/3 text-right">
            <div className="text-lg font-semibold border-t pt-3">
              TOTAL : Rp {total.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENT ================= */
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className="font-medium border-b pb-1">{value}</div>
    </div>
  );
}