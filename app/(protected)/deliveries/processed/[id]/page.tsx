"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  const handleDownloadPdf = () => {
    if (!data) {
      alert("Data belum siap");
      return;
    }

    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const marginX = 10;
    const pageWidth = 210;
    const contentWidth = pageWidth - marginX * 2;
    let y = 15;

    doc.setTextColor(0, 0, 0);

    // ===== TITLE =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    const title = `Surat Jalan - ${data.sj_number} - GUDANG BEKASI`;
    doc.text(title, pageWidth / 2, y, { align: "center" });
    y += 3;
    doc.setLineWidth(0.6);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 7;

    // ===== INFO GRID (2 columns) =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);

    const leftCol: [string, string][] = [
      ["Nomor SO", data.so_number || "-"],
      ["Supplier", data.customer_name || "-"],
      ["Purchase Type", data.purchase_type || "-"],
      ["Telp", data.contact_phone || "-"],
    ];
    const rightCol: [string, string][] = [
      ["Tanggal SO", data.order_date || "-"],
      ["No Ref", data.customer_order_ref || "-"],
      ["Kepada", data.ship_to_name || "-"],
      ["Catatan", data.notes || "-"],
    ];

    const colGap = 6;
    const halfWidth = (contentWidth - colGap) / 2;
    const labelWidth = 32;
    const rowHeight = 6;
    const gridStartY = y;

    leftCol.forEach(([label, value], i) => {
      const rowY = gridStartY + i * rowHeight;
      doc.text(label, marginX, rowY);
      doc.text(value, marginX + labelWidth, rowY);
      doc.setLineWidth(0.3);
      doc.line(marginX, rowY + 2, marginX + halfWidth, rowY + 2);
    });

    rightCol.forEach(([label, value], i) => {
      const rowY = gridStartY + i * rowHeight;
      const colX = marginX + halfWidth + colGap;
      doc.text(label, colX, rowY);
      doc.text(value, colX + labelWidth, rowY);
      doc.setLineWidth(0.3);
      doc.line(colX, rowY + 2, colX + halfWidth, rowY + 2);
    });

    y = gridStartY + leftCol.length * rowHeight + 4;

    // ===== ALAMAT =====
    doc.text("Alamat", marginX, y);
    doc.text(data.delivery_address || "-", marginX + labelWidth, y);
    doc.setLineWidth(0.3);
    doc.line(marginX, y + 2, pageWidth - marginX, y + 2);
    y += 8;

    // ===== ITEMS TABLE =====
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      styles: {
        font: "helvetica",
        fontStyle: "bold",
        fontSize: 10,
        halign: "center",
        valign: "middle",
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
      },
      head: [["No", "Barang / Ukuran", "Isi / Palet", "M3", "Palet", "PCS"]],
      body: data.delivery_items.map((item, idx) => [
        String(idx + 1),
        `${item.product_name}${item.product_size ? ` (${item.product_size})` : ""}`,
        item.isi_per_palet ? String(item.isi_per_palet) : "-",
        `${item.kubik_m3} m3`,
        String(item.pallet_qty),
        String(item.total_pcs),
      ]),
      columnStyles: {
        0: { cellWidth: 10 },
        1: { halign: "left", cellWidth: "auto" },
        2: { cellWidth: 22 },
        3: { cellWidth: 20 },
        4: { cellWidth: 16 },
        5: { cellWidth: 20 },
      },
    });

    // @ts-expect-error - lastAutoTable is attached by the plugin at runtime
    y = doc.lastAutoTable.finalY + 6;

    // ===== RETUR TABLE =====
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      styles: {
        font: "helvetica",
        fontStyle: "bold",
        fontSize: 10,
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
      },
      head: [["Retur Barang", "PCS"]],
      body: data.delivery_items.map((item) => [
        `${item.product_name}${item.product_size ? ` (${item.product_size})` : ""}`,
        String(returns[item.id]?.qty ?? 0),
      ]),
      columnStyles: {
        0: { halign: "left", cellWidth: "auto" },
        1: { halign: "center", cellWidth: 24 },
      },
    });

    // @ts-expect-error - lastAutoTable is attached by the plugin at runtime
    y = doc.lastAutoTable.finalY + 8;

    // ===== NO GUDANG / SUPIR / PLAT (3 columns) =====
    const thirdWidth = (contentWidth - colGap * 2) / 3;
    const driverName = drivers.find((d) => d.id === driverId)?.name || "-";
    const plateNumber = vehicles.find((v) => v.id === vehicleId)?.plate_number || "-";

    const threeCol: [string, string][] = [
      ["No Gudang", noGudang || "-"],
      ["Supir", driverName],
      ["Plat Mobil", plateNumber],
    ];

    doc.setFont("helvetica", "bold");
    threeCol.forEach(([label], i) => {
      const colX = marginX + i * (thirdWidth + colGap);
      doc.text(label, colX, y);
    });

    threeCol.forEach(([, value], i) => {
      const colX = marginX + i * (thirdWidth + colGap);
      doc.text(value, colX, y + 6);
      doc.setLineWidth(0.3);
      doc.line(colX, y + 8, colX + thirdWidth, y + 8);
    });

    y += 20;

    // ===== SIGNATURE FOOTER (4 columns) =====
    doc.setLineWidth(0.6);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 8;

    const fourthWidth = contentWidth / 4;
    const footerLabels = ["Tanda Terima", "Supir", "Dibuat Oleh", "Security"];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    footerLabels.forEach((label, i) => {
      const colX = marginX + i * fourthWidth;
      const textWidth = doc.getTextWidth(label);
      doc.text(label, colX + fourthWidth / 2 - textWidth / 2, y);
    });

    doc.save(`Surat-Jalan-${data.sj_number}.pdf`);
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
          <h1 className="text-2xl font-normal">
            Surat Jalan – {data.sj_number} - GUDANG BEKASI
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4">
          <div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-normal w-36">Nomor SO</span>
              <span className="flex-1">{data.so_number}</span>
            </div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-normal w-36">Supplier</span>
              <span className="flex-1">{data.customer_name}</span>
            </div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-normal w-36">Purchase Type</span>
              <span className="flex-1">{data.purchase_type}</span>
            </div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-normal w-36">Telp</span>
              <span className="flex-1">{data.contact_phone || "-"}</span>
            </div>
          </div>

          <div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-normal w-36">Tanggal SO</span>
              <span className="flex-1">{data.order_date}</span>
            </div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-normal w-36">No Ref</span>
              <span className="flex-1">{data.customer_order_ref}</span>
            </div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-normal w-36">Kepada</span>
              <span className="flex-1">{data.ship_to_name || "-"}</span>
            </div>
            <div className="flex border-b border-gray-200 py-1">
              <span className="font-normal w-36">Catatan</span>
              <span className="flex-1">{data.notes || "-"}</span>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex border-b border-gray-200 py-1">
            <span className="font-normal w-24">Alamat</span>
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
            <label className="block font-normal mb-1">No Gudang</label>
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
            <label className="block font-normal mb-1">Supir</label>
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
            <label className="block font-normal mb-1">Plat Mobil</label>
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
            <p className="font-normal mb-7">Tanda Terima</p>
          </div>
          <div className="text-center">
            <p className="font-normal mb-7">Supir</p>
          </div>
          <div className="text-center">
            <p className="font-normal mb-7">Dibuat Oleh</p>
          </div>
          <div className="text-center">
            <p className="font-normal mb-7">Security</p>
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
            /* Verdana: dirancang khusus untuk keterbacaan di layar & print.
               0 (nol) punya oval melebar, 8 punya dua lingkaran seimbang — sangat mudah dibedakan. */
            font-family: Verdana, Geneva, Tahoma, sans-serif !important;
            font-size: 11pt !important;
            font-weight: 400 !important;
            letter-spacing: 0px;
            color: #000 !important;
            -webkit-font-smoothing: antialiased !important;
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
            font-family: Verdana, Geneva, Tahoma, sans-serif !important;
          }

          #print-content {
            position: absolute;
            inset: 0;
            padding: 0 !important;
            margin: 0 !important;
            font-size: 11pt !important;
            line-height: 1.3 !important;
          }

          #print-content h1 {
            font-size: 18pt !important;
            font-weight: 700 !important;
            margin: 0 0 4pt 0 !important;
            padding-bottom: 4pt !important;
            border-bottom: 1.2pt solid #000 !important;
          }

          #print-content span,
          #print-content p,
          #print-content td,
          #print-content th {
            font-weight: 400 !important;
            color: #000 !important;
          }

          .sj-table {
            width: 100%;
            border-collapse: collapse !important;
            border: 1.2pt solid #000 !important;
            font-size: 10.5pt !important;
          }

          .sj-table th,
          .sj-table td {
            border: 1pt solid #000 !important;
            padding: 3pt 5pt !important;
            vertical-align: middle !important;
          }

          .sj-table th {
            font-weight: 700 !important;
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