'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

type ReturnRow = {
  id: string;
  created_at: string | null;
  tanggal: string | null;
  no_gudang: string | null;
  deposit_code: string | null;
  sj_number: string;
  so_number: string;
  customer_name: string;
  product_name: string;
  ukuran: string;
  harga_satuan: number;
  return_pcs: number;
  total: number;
  return_reason: string;
};

type SortKey = keyof ReturnRow | null;
type SortOrder = 'asc' | 'desc';

const PAGE_SIZE = 100;

export default function ReturnsPage() {
  const [data, setData] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/returns');
        const json = await res.json();
        setData(Array.isArray(json) ? json : []);
      } catch (err) {
        console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Reset ke halaman 1 kalau filter/sort berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFrom, dateTo, sortKey, sortOrder]);

  /* ================= FILTER + SORT ================= */
  const filteredData = useMemo(() => {
    let result = [...data];

    if (search) {
      const keyword = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.customer_name?.toLowerCase().includes(keyword) ||
          r.no_gudang?.toLowerCase().includes(keyword) ||
          r.sj_number?.toLowerCase().includes(keyword) ||
          r.so_number?.toLowerCase().includes(keyword) ||
          r.deposit_code?.toLowerCase().includes(keyword)
      );
    }

    if (dateFrom || dateTo) {
      result = result.filter((r) => {
        if (!r.tanggal) return false;
        const rowDate = new Date(r.tanggal).setHours(0, 0, 0, 0);
        const from = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
        const to = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;
        return (!from || rowDate >= from) && (!to || rowDate <= to);
      });
    }

    if (sortKey) {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        if (valA == null) return 1;
        if (valB == null) return -1;

        if (sortKey === 'tanggal' || sortKey === 'created_at') {
          const timeA = new Date(valA as string).getTime();
          const timeB = new Date(valB as string).getTime();
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }

        return sortOrder === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [data, search, dateFrom, dateTo, sortKey, sortOrder]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(
      (page) =>
        page === 1 ||
        page === totalPages ||
        Math.abs(page - currentPage) <= 2
    )
    .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
      if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
        acc.push('ellipsis');
      }
      acc.push(page);
      return acc;
    }, []);

  /* ================= TOTALS (selalu dari filteredData) ================= */
  const totalPcs = filteredData.reduce((s, r) => s + r.return_pcs, 0);
  const grandTotal = filteredData.reduce((s, r) => s + r.total, 0);

  /* ================= SORT HANDLER ================= */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  /* ================= EXCEL ================= */
  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredData.map((r, i) => ({
        No: i + 1,
        Tanggal: r.tanggal,
        'No Gudang': r.no_gudang,
        'Kode Deposit': r.deposit_code,
        'No SJ': r.sj_number,
        'No SO': r.so_number,
        Supplier: r.customer_name,
        Barang: r.product_name,
        Ukuran: r.ukuran,
        'Harga Satuan': r.harga_satuan,
        'PCS Retur': r.return_pcs,
        Total: r.total,
        Alasan: r.return_reason,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Retur');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(blob, `data-retur-${Date.now()}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading data retur...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* ===== HEADER ===== */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Data Retur</h1>
          <p className="text-gray-600">
            {filteredData.length} transaksi | {totalPcs.toLocaleString()} pcs | Rp{' '}
            {grandTotal.toLocaleString()}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            placeholder="Cari Supplier / No SJ / No SO"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              setSearch('');
              setDateFrom('');
              setDateTo('');
            }}
            className="bg-gray-200 hover:bg-gray-300 rounded px-3 py-2 text-sm"
          >
            Reset
          </button>
          <button
            onClick={downloadExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
          >
            Download Excel
          </button>
        </div>
      </div>

      {/* ===== TABEL ===== */}
      <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-4 py-3 text-center">No</th>
              {(
                [
                  ['tanggal', 'Tanggal'],
                  ['no_gudang', 'No Gudang'],
                  ['deposit_code', 'Kode Deposit'],
                  ['sj_number', 'No SJ'],
                  ['so_number', 'No SO'],
                  ['customer_name', 'Supplier'],
                  ['product_name', 'Barang'],
                  ['ukuran', 'Ukuran'],
                  ['harga_satuan', 'Harga'],
                  ['return_pcs', 'PCS'],
                  ['total', 'Total'],
                ] as [string, string][]
              ).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => handleSort(key as SortKey)}
                  className="px-4 py-3 cursor-pointer select-none hover:bg-gray-700 transition"
                >
                  <div className="flex items-center justify-center gap-1">
                    {label}
                    <span className="text-xs">{sortIcon(key as SortKey)}</span>
                  </div>
                </th>
              ))}
              <th className="px-4 py-3">Alasan</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((row, i) => (
              <tr key={row.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 text-center font-medium">
                  {(currentPage - 1) * PAGE_SIZE + i + 1}
                </td>
                <td className="px-4 py-2">
                  {row.tanggal
                    ? new Date(row.tanggal).toLocaleDateString('id-ID')
                    : '-'}
                </td>
                <td className="px-4 py-2 text-center">{row.no_gudang ?? '-'}</td>
                <td className="px-4 py-2">{row.deposit_code ?? '-'}</td>
                <td className="px-4 py-2">{row.sj_number}</td>
                <td className="px-4 py-2">{row.so_number}</td>
                <td className="px-4 py-2">{row.customer_name}</td>
                <td className="px-4 py-2">{row.product_name}</td>
                <td className="px-4 py-2 text-center">{row.ukuran}</td>
                <td className="px-4 py-2 text-right">
                  Rp {row.harga_satuan.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-center text-red-600 font-semibold">
                  {row.return_pcs}
                </td>
                <td className="px-4 py-2 text-right font-semibold">
                  Rp {row.total.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-gray-600">{row.return_reason}</td>
              </tr>
            ))}
          </tbody>

          {/* ===== FOOTER TOTAL ===== */}
          <tfoot className="bg-gray-100 font-bold">
            <tr>
              <td
                colSpan={9}
                className="px-4 py-3 text-right border-t-2 border-gray-300"
              >
                TOTAL HARGA RETUR
              </td>
              <td className="px-4 py-3 text-right border-t-2 border-gray-300">
                Rp {grandTotal.toLocaleString()}
              </td>
              <td className="border-t-2 border-gray-300"></td>
              <td className="border-t-2 border-gray-300"></td>
              <td className="border-t-2 border-gray-300"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ===== PAGINATION ===== */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            Halaman <span className="font-semibold">{currentPage}</span> dari{' '}
            <span className="font-semibold">{totalPages}</span>
            &nbsp;·&nbsp; Menampilkan{' '}
            <span className="font-semibold">
              {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredData.length)}
            </span>{' '}
            dari <span className="font-semibold">{filteredData.length}</span> transaksi
          </p>

          <div className="flex items-center gap-1 flex-wrap">
            {/* First */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-100"
            >
              «
            </button>

            {/* Prev */}
            <button
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-100"
            >
              ‹ Prev
            </button>

            {/* Page numbers */}
            {pageNumbers.map((item, idx) =>
              item === 'ellipsis' ? (
                <span key={`e-${idx}`} className="px-2 py-1 text-sm text-gray-400">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => setCurrentPage(item as number)}
                  className={`px-3 py-1 rounded border text-sm transition ${
                    currentPage === item
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {item}
                </button>
              )
            )}

            {/* Next */}
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-100"
            >
              Next ›
            </button>

            {/* Last */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-100"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
