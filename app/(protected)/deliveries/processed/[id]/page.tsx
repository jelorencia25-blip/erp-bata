"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  kubik_m3: number;
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
  no_gudang?: string | null;
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
  
  const [noGudang, setNoGudang] = useState("");
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
        const apiUrl = `/api/deliveries/processed/${id}`;
    console.log("🌐 FETCHING URL:", apiUrl);
    
    const res = await fetch(apiUrl);
    console.log("🌐 Response URL:", res.url);
    console.log("🌐 Response status:", res.status);
        if (!res.ok) throw new Error((await res.json()).error || "Gagal load data");
        const json: Delivery = await res.json();

        console.log("DELIVERY RESPONSE:", json);
        console.log("NO GUDANG:", json.no_gudang);
      
// 🔥 TARUH DEBUG LOGS DI SINI (SEBELUM setData)
console.log("🔍 RAW API RESPONSE:", JSON.stringify(json, null, 2));
console.log("🔍 no_gudang:", json.no_gudang);
console.log("🔍 no_gudang type:", typeof json.no_gudang);
console.log("🔍 no_gudang === null?", json.no_gudang === null);
console.log("🔍 no_gudang === undefined?", json.no_gudang === undefined);

        setData(json);
        setNoGudang(json.no_gudang ?? "");
        setDriverId(json.staff?.id ?? "");
        setVehicleId(json.vehicle?.id ?? "");

        const [driversRes, vehiclesRes] = await Promise.all([
          fetch(`/api/staffsmanagement`).then(r => r.json()),
          fetch(`/api/vehicles`).then(r => r.json()),
        ]);
        
        setDrivers(driversRes.filter((d: any) => d.status === "active" && d.posisi?.toLowerCase().includes("supir")));
        setVehicles(vehiclesRes.filter((v: any) => v.status === "active"));

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

  

  const stripUnsupportedColors = (el: HTMLElement) => {
    const all = el.querySelectorAll("*");

    all.forEach((node) => {
      const style = window.getComputedStyle(node);

      [
        "color",
        "backgroundColor",
        "borderColor",
        "borderTopColor",
        "borderRightColor", 
        "borderBottomColor",
        "borderLeftColor",
      ].forEach((prop) => {
        const value = style[prop as any];
        if (value?.includes("lab(") || value?.includes("oklab(") || value?.includes("lch(")) {
          (node as HTMLElement).style[prop as any] = "#000";
        }
      });
    });
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById("print-content");
    if (!element) {
      alert("Element tidak ditemukan");
      return;
    }

    // Clone element untuk tidak mengganggu tampilan asli
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Hide print-only elements dan show hidden print inputs
    clone.querySelectorAll('.print\\:hidden').forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
    clone.querySelectorAll('.hidden.print\\:inline').forEach(el => {
      (el as HTMLElement).style.display = 'inline';
    });
    clone.querySelectorAll('.hidden.print\\:block').forEach(el => {
      (el as HTMLElement).style.display = 'block';
    });

    // Append ke body sementara (agar bisa di-render)
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.width = '210mm'; // A4 width
    clone.style.padding = '10mm';
    clone.style.backgroundColor = '#ffffff';
    document.body.appendChild(clone);

    // Strip unsupported colors
    stripUnsupportedColors(clone);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Surat-Jalan-${data?.sj_number}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Gagal generate PDF");
    } finally {
      // Remove clone
      document.body.removeChild(clone);
    }
  };

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
          no_gudang: noGudang,
          returns,
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
            onClick={handleDownloadPdf}
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition"
          >
            Download PDF
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

      <div id="print-content" className="bg-white p-10 rounded shadow">
        <div className="text-center border-b-2 border-gray-300 pb-3 mb-4">
          <h1 className="text-2xl font-bold">
            Surat Jalan – {data.sj_number} - GUDANG BEKASI
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
                <th className="text-center w-20">M3</th>
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
                   <td className="text-center py-2">{item.kubik_m3} m³</td>
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
                        min={0}
                        value={returns[item.id]?.qty ?? 0}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Number(e.target.value);

                          setReturns((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              qty: val,
                            },
                          }));
                        }}
                        className="w-16 border text-center"
                      />
                    </span>

                    <span className="hidden print:inline">
                      {returns[item.id]?.qty ?? 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-4">
          <div>
            <label className="block font-semibold mb-1">No Gudang</label>

            <div className="print:hidden">
              <input
                type="text"
                value={noGudang}
                onChange={(e) => setNoGudang(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div className="hidden print:block border-b border-gray-300 py-1">
              {noGudang || "-"}
            </div>
          </div>

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
          </div>
          
          <div className="text-center">
            <p className="font-semibold mb-7">Supir</p>
          </div>
          
          <div className="text-center">
            <p className="font-semibold mb-7">Dibuat Oleh</p>
          </div>
          
          <div className="text-center">
            <p className="font-semibold mb-7">Security</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 6mm;
          }

          body {
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 12pt !important;
            font-weight: 700 !important;
            color: #000 !important;
            -webkit-font-smoothing: none !important;
            -moz-osx-font-smoothing: auto !important;
            text-rendering: optimizeSpeed !important;
          }

          body * {
            visibility: hidden;
            color: #000 !important;
          }

          #print-content,
          #print-content * {
            visibility: visible !important;
            color: #000 !important;
            background: transparent !important;
            box-shadow: none !important;
            filter: none !important;
          }

          #print-content {
            position: absolute;
            inset: 0;
            padding: 0 !important;
            margin: 0 !important;
            font-size: 12pt !important;
            line-height: 1.15 !important;
          }

          #print-content h1 {
            font-size: 16pt !important;
            font-weight: 800 !important;
            margin: 0 0 4pt 0 !important;
            padding-bottom: 4pt !important;
            border-bottom: 1.2pt solid #000 !important;
          }

          #print-content span,
          #print-content p,
          #print-content td,
          #print-content th {
            font-weight: 700 !important;
            color: #000 !important;
          }

          .sj-table {
            width: 100%;
            border-collapse: collapse !important;
            border: 1.2pt solid #000 !important;
            font-size: 11.8pt !important;
          }

          .sj-table th,
          .sj-table td {
            border: 1pt solid #000 !important;
            padding: 3pt 4pt !important;
            vertical-align: middle !important;
          }

          .sj-table th {
            font-weight: 800 !important;
            text-align: center;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:inline {
            display: inline !important;
          }

          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}