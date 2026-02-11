'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Vehicle = {
  id: string;
  plate_number: string;
  status: string;
};

type Staff = {
  id: string;
  name: string;
  posisi: string;
  status: string;
};

export default function AssignDeliveryPage() {
  const { id } = useParams(); // sales_order_id
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [so, setSO] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Staff[]>([]);

  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [returns, setReturns] = useState<Record<string, number>>({});

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      try {
        const [soRes, vRes, sRes] = await Promise.all([
          fetch(`/api/salesorders/${id}`).then(r => r.json()),
          fetch(`/api/vehicles`).then(r => r.json()),
          fetch(`/api/staffsmanagement`).then(r => r.json()),
        ]);

        setSO(soRes);

        setVehicles(vRes.filter((v: any) => v.status === "active"));
        setDrivers(
          sRes.filter(
            (s: any) =>
              s.status === "active" &&
              s.posisi.toLowerCase().includes("supir")
          )
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleSave = async () => {
  if (!vehicleId || !driverId) {
    alert("Pilih supir & mobil dulu");
    return;
  }

  if (!so) return;

  setSaving(true);
  try {
    const res = await fetch(`/api/deliveries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sales_order_id: id,
        vehicle_id: vehicleId,
        driver_id: driverId,
        returns,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Gagal membuat Surat Jalan");
      return;
    }

    alert(`Surat Jalan berhasil dibuat (SJ ID: ${data.delivery_id})`);

    // Redirect ke tab processed di DeliveriesPage
    router.push("/deliveries?tab=processed");

  } catch (err) {
    console.error(err);
    alert("Gagal membuat Surat Jalan");
  } finally {
    setSaving(false);
  }
};


  if (loading) return <div className="p-8">Loading...</div>;
  if (!so) return <div className="p-8">Sales Order tidak ditemukan</div>;

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="flex justify-between mb-6">
        <button onClick={() => router.back()} className="text-gray-600">
          ← Kembali
        </button>
        <div className="flex gap-3">
          {/* <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Print
          </button> */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Save"}
          </button>
        </div>
      </div>

      <div className="bg-white p-10 rounded shadow">
        <h1 className="text-2xl font-bold mb-6">
          Surat Jalan (Draft) – {so.so_number}
        </h1>

        {/* HEADER SO */}
        <div className="grid grid-cols-2 gap-x-16 gap-y-4 text-sm mb-8">
          <Info label="Nomor SO" value={so.so_number} />
          <Info label="Tanggal SO" value={so.order_date} />
          <Info label="Supplier" value={so.customers?.name} />
          <Info label="No Ref Supplier" value={so.customer_order_ref} />
          <Info label="Purchase Type" value={so.purchase_type} />
          <Info label="Kepada" value={so.ship_to_name} />
          <Info label="Telp" value={so.contact_phone} />
          <Info label="Catatan" value={so.notes} />

          <div className="col-span-2">
            <div className="text-gray-800">Alamat</div>
            <div className="border-b pb-2 font-medium">
              {so.delivery_address}
            </div>
          </div>
        </div>

        {/* BARANG */}
        <table className="w-full text-sm border mb-10">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th>No</th>
              <th className="text-left">Barang / Ukuran</th>
              <th>Isi / Palet</th>
              <th>Palet</th>
              <th>PCS</th>
              <th>M3 / Palet</th> 
            </tr>
          </thead>
       <tbody>
  {(so.sales_order_items || []).map((i: any, idx: number) => (
    <tr key={i.id} className="border-b">
      <td className="text-center">{idx + 1}</td>

      <td>
        {i.products?.name} ({i.products?.ukuran})
      </td>

      {/* Isi per palet */}
      <td className="text-center">
        {i.products?.isi_per_palet ?? "-"}
      </td>

      {/* Jumlah palet */}
      <td className="text-center">
        {i.pallet_qty}
      </td>

      {/* Total PCS */}
      <td className="text-center">
        {i.total_pcs}
      </td>

      {/* Kubik M3 */}
      <td className="text-center">
        {i.total_m3
          ? `${i.total_m3} m³`
          : "-"}
      </td>
    </tr>
  ))}
</tbody>
        </table>

        {/* RETURN */}
        <h3 className="font-semibold mb-2">Return Barang</h3>
        <table className="w-full text-sm border mb-8">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="text-left px-2">Barang</th>
              <th className="w-40">Return (PCS)</th>
            </tr>
          </thead>
          <tbody>
           {(so.sales_order_items || []).map((i: any, idx: number) => (

              <tr key={i.id} className="border-b">
                <td className="px-2 py-2">
                  {i.products?.name} ({i.products?.ukuran})
                </td>
                <td className="px-2">
                  <input
                    type="number"
                    min={0}
                    max={i.total_pcs}
                    value={returns[i.id] ?? 0}
                    onChange={(e) =>
                      setReturns({
                        ...returns,
                        [i.id]: Number(e.target.value),
                      })
                    }
                    className="border p-1 w-full rounded"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ASSIGN */}
      <div className="grid grid-cols-2 gap-6 mt-6">
  {/* SUPIR */}
  <div>
    <label className="block text-sm text-gray-600 mb-1">
      Nama Supir
    </label>
    <select
      value={driverId}
      onChange={(e) => setDriverId(e.target.value)}
      className="border p-2 rounded w-full"
    >
      <option value="">-- Pilih Supir --</option>
      {drivers.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}
        </option>
      ))}
    </select>
  </div>

  {/* MOBIL */}
  <div>
    <label className="block text-sm text-gray-600 mb-1">
      Plat Mobil
    </label>
    <select
      value={vehicleId}
      onChange={(e) => setVehicleId(e.target.value)}
      className="border p-2 rounded w-full"
    >
      <option value="">-- Pilih Mobil --</option>
      {vehicles.map((v) => (
        <option key={v.id} value={v.id}>
          {v.plate_number}
        </option>
      ))}
    </select>
  </div>
</div>
      </div>
    </div>  
  );
}

function Info({ label, value }: any) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className="border-b pb-1 font-medium">{value ?? "-"}</div>
    </div>
  );
}