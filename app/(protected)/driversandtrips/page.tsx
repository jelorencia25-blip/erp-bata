'use client';

import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

type Row = {
  id: string;
  tanggal: string;
  driver: string;
  surat_jalan: string;
  plat: string;
  alamat: string;
  uang_jalan: number;
  tambahan: number;
  total: number;
  bayar: "paid" | "unpaid";
};

export default function DriverTripsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [driverFilter, setDriverFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/driversandtrips", { cache: "no-store" });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load error:", error);
      alert("❌ Gagal load data");
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (id: string, field: keyof Row, value: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        const uang_jalan =
          field === "uang_jalan" ? Number(value) || 0 : Number(r.uang_jalan);
        const tambahan =
          field === "tambahan" ? Number(value) || 0 : Number(r.tambahan);

        return {
          ...r,
          uang_jalan: field === "uang_jalan" ? Number(value) || 0 : r.uang_jalan,
          tambahan: field === "tambahan" ? Number(value) || 0 : r.tambahan,
          bayar: field === "bayar" ? value : r.bayar,
          total: uang_jalan + tambahan,
        };
      })
    );
  };

  const saveRow = async (row: Row) => {
    setSavingRows((prev) => new Set(prev).add(row.id));

    try {
      const res = await fetch("/api/driversandtrips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          uang_jalan: row.uang_jalan,
          biaya_tambahan: row.tambahan,
          status_pembayaran: row.bayar,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Gagal menyimpan");
      }

      alert("✅ Data tersimpan!");
      await loadData();
    } catch (error: any) {
      console.error("Save error:", error);
      alert(`❌ ${error.message}`);
    } finally {
      setSavingRows((prev) => {
        const newSet = new Set(prev);
        newSet.delete(row.id);
        return newSet;
      });
    }
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Filter by driver
      if (driverFilter && !r.driver.toLowerCase().includes(driverFilter.toLowerCase())) {
        return false;
      }

      // Filter by date range
      const rowDate = new Date(r.tanggal);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (rowDate < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (rowDate > toDate) return false;
      }

      return true;
    });
  }, [rows, driverFilter, dateFrom, dateTo]);

  // Summary
  const overview = useMemo(() => {
    const totalUangJalan = filteredRows.reduce((s, r) => s + r.uang_jalan, 0);
    const totalTambahan = filteredRows.reduce((s, r) => s + r.tambahan, 0);
    const total = filteredRows.reduce((s, r) => s + r.total, 0);
    const paid = filteredRows
      .filter((r) => r.bayar === "paid")
      .reduce((s, r) => s + r.total, 0);
    const unpaid = total - paid;
    return { totalUangJalan, totalTambahan, total, paid, unpaid };
  }, [filteredRows]);

  const drivers = useMemo(
    () => Array.from(new Set(rows.map((r) => r.driver))).filter((d) => d !== "-"),
    [rows]
  );

  // Export to Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData: (string | number)[][] = [];

    // Header
    wsData.push([
      "No",
      "Tanggal",
      "Driver",
      "SJ",
      "Plat",
      "Alamat",
      "Uang Jalan",
      "Tambahan",
      "Total",
      "Status",
    ]);

    // Rows
    filteredRows.forEach((r, i) => {
      wsData.push([
        i + 1,
        new Date(r.tanggal).toLocaleDateString("id-ID"),
        r.driver,
        r.surat_jalan,
        r.plat,
        r.alamat,
        r.uang_jalan,
        r.tambahan,
        r.total,
        r.bayar,
      ]);
    });

    // Total row
    const totalUangJalan = filteredRows.reduce((s, r) => s + r.uang_jalan, 0);
    const totalTambahan = filteredRows.reduce((s, r) => s + r.tambahan, 0);
    const totalTotal = filteredRows.reduce((s, r) => s + r.total, 0);

    wsData.push([
      "",
      "",
      "",
      "",
      "",
      "TOTAL",
      totalUangJalan,
      totalTambahan,
      totalTotal,
      "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "DriverTrips");

    XLSX.writeFile(wb, "DriverTrips.xlsx");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Judul */}
          <h1 className="text-3xl font-bold text-gray-800">
            🚚 Driver & Trips Management
          </h1>

          {/* Export Button */}
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
          >
            Download Excel
          </button>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            {/* Filter Driver */}
            <div className="flex flex-col gap-2 w-full lg:w-auto">
              <label className="text-sm font-medium text-gray-700">Filter Driver:</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 min-w-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
              >
                <option value="">Semua Driver</option>
                {drivers.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="flex flex-col gap-2 w-full lg:w-auto">
              <label className="text-sm font-medium text-gray-700">Dari Tanggal:</label>
              <input
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="flex flex-col gap-2 w-full lg:w-auto">
              <label className="text-sm font-medium text-gray-700">Sampai Tanggal:</label>
              <input
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* Reset Button */}
            {(driverFilter || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDriverFilter("");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
            <div className="text-xs text-purple-600 font-medium">Total Uang Jalan</div>
            <div className="text-lg font-bold text-purple-700">
              Rp {overview.totalUangJalan.toLocaleString("id-ID")}
            </div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
            <div className="text-xs text-orange-600 font-medium">Total Tambahan</div>
            <div className="text-lg font-bold text-orange-700">
              Rp {overview.totalTambahan.toLocaleString("id-ID")}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div className="text-xs text-blue-600 font-medium">Total Keseluruhan</div>
            <div className="text-lg font-bold text-blue-700">
              Rp {overview.total.toLocaleString("id-ID")}
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <div className="text-xs text-green-600 font-medium">Paid</div>
            <div className="text-lg font-bold text-green-700">
              Rp {overview.paid.toLocaleString("id-ID")}
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <div className="text-xs text-red-600 font-medium">Unpaid</div>
            <div className="text-lg font-bold text-red-700">
              Rp {overview.unpaid.toLocaleString("id-ID")}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full table-auto text-sm">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">No</th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Tanggal</th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Supir</th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ minWidth: "100px" }}>SJ</th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ minWidth: "100px" }}>Plat</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ minWidth: "180px" }}>Alamat</th>
                <th className="px-3 py-2 text-right font-semibold" style={{ minWidth: "100px" }}>Uang Jalan</th>
                <th className="px-3 py-2 text-right font-semibold" style={{ minWidth: "100px" }}>Tambahan</th>
                <th className="px-3 py-2 text-right font-semibold" style={{ minWidth: "120px" }}>Total</th>
                <th className="px-3 py-2 text-center font-semibold" style={{ minWidth: "100px" }}>Status</th>
                <th className="px-3 py-2 text-center font-semibold" style={{ minWidth: "90px" }}>Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-gray-500">Tidak ada data</td>
                </tr>
              ) : (
                filteredRows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap">{i + 1}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.tanggal).toLocaleDateString("id-ID")}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">{r.driver}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.surat_jalan}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.plat}</td>
                    <td className="px-3 py-2 truncate max-w-45">{r.alamat}</td>

                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        value={r.uang_jalan}
                        onChange={(e) => updateRow(r.id, "uang_jalan", e.target.value)}
                        className="w-24 px-2 py-1 text-right border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </td>

                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        value={r.tambahan}
                        onChange={(e) => updateRow(r.id, "tambahan", e.target.value)}
                        className="w-24 px-2 py-1 text-right border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </td>

                    <td className="px-3 py-2 text-right whitespace-nowrap font-bold">
                      Rp {r.total.toLocaleString("id-ID")}
                    </td>

                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <select
                        value={r.bayar}
                        onChange={(e) => updateRow(r.id, "bayar", e.target.value)}
                        className={`w-full max-w-25 px-2 py-1 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 ${
                          r.bayar === "paid"
                            ? "bg-green-50 border-green-300 text-green-700"
                            : "bg-red-50 border-red-300 text-red-700"
                        }`}
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="paid">Paid</option>
                      </select>
                    </td>

                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <button
                        onClick={() => saveRow(r)}
                        disabled={savingRows.has(r.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {savingRows.has(r.id) ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="text-center text-sm text-gray-500">
          Showing {filteredRows.length} of {rows.length} trips
        </div>
      </div>
    </div>
  );
}
