"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

type Vehicle = { id: string; plate_number: string };
type Staff = { id: string; name: string };

type DeliveryItem = {
  id: string;
  product_id: string;
  pallet_qty: number;
  total_pcs: number;
  product_name: string;
  product_size: string;
  isi_per_palet: number;
  return_pcs: number;
};

type DeliveryReturnItem = {
  id: string;
  product_id: string;
  return_pcs: number;
  return_reason?: string;
};

type Delivery = {
  id: string;
  sj_number: string;
  so_number: string;
  order_date: string;
  customer_name: string;
  customer_order_ref: string;
  ship_to_name: string;
  contact_phone: string;
  delivery_address: string;
  notes: string;
  purchase_type: string;
  staff?: Staff | null;
  vehicle?: Vehicle | null;
  delivery_items: DeliveryItem[];
  delivery_return_items: DeliveryReturnItem[];
};

export default function DeliveryProcessedDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [data, setData] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [returns, setReturns] = useState<Record<string, { qty: number; reason: string }>>({});

  const [drivers, setDrivers] = useState<Staff[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (!id) {
      setError("ID tidak tersedia");
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/deliveries/processed/${id}`);
        if (!res.ok) throw new Error((await res.json()).error || "Gagal load data");
        const json: Delivery = await res.json();
        setData(json);

        const [driversRes, vehiclesRes] = await Promise.all([
          fetch(`/api/staffsmanagement`).then(r => r.json()),
          fetch(`/api/vehicles`).then(r => r.json()),
        ]);
        setDrivers(driversRes.filter((d: any) => d.status === "active" && d.posisi?.toLowerCase().includes("supir")));
        setVehicles(vehiclesRes.filter((v: any) => v.status === "active"));

        setDriverId(json.staff?.id ?? "");
        setVehicleId(json.vehicle?.id ?? "");

        const initialReturns: Record<string, { qty: number; reason: string }> = {};
        json.delivery_items.forEach(item => {
          initialReturns[item.id] = {
            qty: item.return_pcs || 0,
            reason: ""
          };
        });
        setReturns(initialReturns);

      } catch (err: any) {
        console.error(err);
        setError(err.message);
      }
      setLoading(false);
    };

    loadData();
  }, [id]);

  const handleSave = async () => {
    if (!driverId || !vehicleId) {
      alert("Pilih supir & mobil dulu");
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`/api/deliveries/processed/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          driver_id: driverId, 
          vehicle_id: vehicleId, 
          returns 
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || "Gagal update delivery");
        return;
      }
      alert("Delivery berhasil diperbarui");
      router.push("/deliveries");
    } catch (err) {
      console.error(err);
      alert("Gagal update delivery");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-lg">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Data tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button 
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Kembali
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            Print
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition disabled:bg-gray-400"
          >
            {saving ? "Menyimpan..." : "Save"}
          </button>
        </div>
      </div>

      <div id="print-content" className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center border-b-2 border-gray-300 pb-3 mb-4">
          <h1 className="text-2xl font-bold">
            Surat Jalan – {data.sj_number}
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4">
          <div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-semibold w-36">Nomor SO</span>
              <span className="flex-1">{data.so_number}</span>
            </div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-semibold w-36">Supplier</span>
              <span className="flex-1">{data.customer_name}</span>
            </div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-semibold w-36">Purchase Type</span>
              <span className="flex-1">{data.purchase_type}</span>
            </div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-semibold w-36">Telp</span>
              <span className="flex-1">{data.contact_phone || "-"}</span>
            </div>
          </div>

          <div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-semibold w-36">Tanggal SO</span>
              <span className="flex-1">{data.order_date}</span>
            </div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-semibold w-36">No Ref</span>
              <span className="flex-1">{data.customer_order_ref}</span>
            </div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-semibold w-36">Kepada</span>
              <span className="flex-1">{data.ship_to_name || "-"}</span>
            </div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-semibold w-36">Catatan</span>
              <span className="flex-1">{data.notes || "-"}</span>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex border-b border-gray-200 py-1">
            <span className="font-semibold w-24">Alamat</span>
            <span className="flex-1">{data.delivery_address || "-"}</span>
          </div>
        </div>

        <div className="mb-3">
         <table className="w-full border-collapse sj-table">
  <thead>
    <tr>
      <th className="text-center w-8">No</th>
      <th className="text-left">Barang / Ukuran</th>
      <th className="text-center w-20">Isi / Palet</th>
      <th className="text-center w-16">Palet</th>
      <th className="text-center w-20">PCS</th>
    </tr>
  </thead>
  <tbody>
    {data.delivery_items.map((item, idx) => (
      <tr key={item.id}>
        <td className="text-center">{idx + 1}</td>
        <td>
          {item.product_name}
          {item.product_size ? ` (${item.product_size})` : ""}
        </td>
        <td className="text-center">
          {item.isi_per_palet || "-"}
        </td>
        <td className="text-center">{item.pallet_qty}</td>
        <td className="text-center">{item.total_pcs}</td>
      </tr>
    ))}
  </tbody>
</table>

        </div>

        <div className="mb-3">
         
        <table className="w-full border-collapse sj-table mt-2">
  <thead>
    <tr>
      <th className="text-left">Retur Barang</th>
      <th className="text-center w-20">PCS</th>
    </tr>
  </thead>
  <tbody>
    {data.delivery_items.map((item) => (
      <tr key={item.id}>
        <td>
          {item.product_name}
          {item.product_size ? ` (${item.product_size})` : ""}
        </td>
        <td className="text-center">
          <span className="print:hidden">
            <input
              type="number"
              value={returns[item.id]?.qty || 0}
              className="w-16 border text-center"
            />
          </span>
          <span className="hidden print:inline">
            {returns[item.id]?.qty || 0}
          </span>
        </td>
      </tr>
    ))}
  </tbody>
</table>

        </div>

        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <label className="block font-semibold mb-1">Supir</label>
            <div className="print:hidden">
              <select 
                value={driverId} 
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">-- Pilih Supir --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="hidden print:block border-b border-gray-300 py-1">
              {drivers.find(d => d.id === driverId)?.name || "-"}
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Plat Mobil</label>
            <div className="print:hidden">
              <select 
                value={vehicleId} 
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">-- Pilih Mobil --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.plate_number}</option>
                ))}
              </select>
            </div>
            <div className="hidden print:block border-b border-gray-300 py-1">
              {vehicles.find(v => v.id === vehicleId)?.plate_number || "-"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t-2 border-gray-300">
          <div className="text-center">
            <p className="font-semibold mb-7">Tanda Terima</p>
           
              {/* <p className="text-sm">(................)</p> */}
          
          </div>
          
          <div className="text-center">
            <p className="font-semibold mb-7">Supir</p>
           
              {/* <p className="text-sm">
                ({drivers.find(d => d.id === driverId)?.name || "................"})
              </p> */}
            
          </div>
          
          <div className="text-center">
            <p className="font-semibold mb-7">Dibuat Oleh</p>
            
              {/* <p className="text-sm">(................)</p> */}
            
          </div>
          
          <div className="text-center">
            <p className="font-semibold mb-7">Security</p>
          
              {/* <p className="text-sm">(................)</p> */}
           
          </div>
        </div>
      </div>

<style jsx global>{`
  @media print {

    /* ================= PAGE ================= */
    @page {
      size: A4 portrait;
      margin: 6mm 6mm;
    }

    body {
      font-family: "Courier New", Courier, monospace !important;
      font-weight: 600 !important;
      color: #000 !important;
    }

    body * {
      visibility: hidden;
    }

    #print-content,
    #print-content * {
      visibility: visible;
    }

    #print-content {
      position: absolute;
      inset: 0;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      font-size: 12pt !important;
      line-height: 1.1 !important;
    }

    /* ================= HEADER ================= */
    #print-content h1 {
      font-size: 16pt !important;
      margin: 0 0 4pt 0 !important;
      padding-bottom: 4pt !important;
      border-bottom: 1pt solid #000 !important;
    }

    #print-content .font-semibold {
      font-weight: 700 !important;
      font-size: 12pt !important;
    }

    #print-content .border-b {
      border-bottom: 0.8pt solid #000 !important;
    }

    /* ================= TABLE ================= */
    .sj-table {
      width: 100%;
      border-collapse: collapse !important;
      border: 1pt solid #000 !important;
      font-size: 11.5pt !important;
    }

    .sj-table th,
    .sj-table td {
      border: 0.8pt solid #000 !important;
      padding: 2pt 4pt !important;
      vertical-align: middle !important;
    }

    .sj-table th {
      font-weight: 700 !important;
      text-align: center;
    }

    .sj-table thead {
      background: none !important;
    }

    /* ================= PRINT UTILS ================= */
    .print\\:hidden {
      display: none !important;
    }

    .print\\:inline {
      display: inline !important;
    }

    .print\\:block {
      display: block !important;
    }

    /* ================= SIGNATURE ================= */
    #print-content .grid-cols-4 {
      margin-top: 10pt !important;
    }

    #print-content .grid-cols-4 p {
      margin: 0 !important;
      padding: 0 !important;
    }

  }
`}</style>


    </div>
  );
}
