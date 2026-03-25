'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type FakturRow = {
  no: number;
  so_number: string;
  ukuran: string;
  retur_pcs: number;
  nama_toko: string;
  nilai_invoice: number;
};

type FakturData = {
  deposit_code: string;
  supplier_name: string;
  tanggal: string;
  tanggal_deposit: string;
  rows: FakturRow[];
};

export default function FakturTerimaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const depositId = searchParams.get('deposit_id');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FakturData | null>(null);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalDeposit, setTanggalDeposit] = useState('');

  useEffect(() => {
    if (!depositId) { router.push('/deposits'); return; }

    fetch(`/api/deposits/${depositId}`)
      .then(r => r.json())
      .then(async (depositData) => {
        const deposit = depositData.deposit;
        const usages = depositData.usages || [];

        setTanggalDeposit(deposit.deposit_date || '');

        // Group usages by SO id
        const soMap = new Map<string, typeof usages>();
        for (const u of usages) {
          const soId = u.sales_order?.id;
          if (!soId) continue;
          if (!soMap.has(soId)) soMap.set(soId, []);
          soMap.get(soId)!.push(u);
        }

        const rows: FakturRow[] = [];
        let no = 1;

        for (const [_, soUsages] of soMap) {
          const firstUsage = soUsages[0];
          const ukuranSet = new Set<string>();
          let totalReturPcs = 0;
          let totalNilaiInvoice = 0;

          // Fetch invoice per DO yang ada di SO ini
          for (const u of soUsages) {
            if (!u.delivery_order_id) continue;

            const invoiceRes = await fetch(`/api/invoices/${u.delivery_order_id}`);
            const invoiceData = await invoiceRes.json();

            for (const item of invoiceData.items || []) {
              if (item.product_size) ukuranSet.add(item.product_size);
              totalReturPcs += item.return_pcs ?? 0;
            }
            totalNilaiInvoice += invoiceData.total_tagihan ?? 0;
          }

          rows.push({
            no: no++,
            so_number: firstUsage.sales_order?.so_number || '-',
            ukuran: Array.from(ukuranSet).join(', ') || '-',
            retur_pcs: totalReturPcs,
            nama_toko: firstUsage.sales_order?.ship_to_name || '-',
            nilai_invoice: totalNilaiInvoice,
          });
        }

        setData({
          deposit_code: deposit.deposit_code,
          supplier_name: deposit.customer_name,
          tanggal: new Date().toISOString().split('T')[0],
          tanggal_deposit: deposit.deposit_date || '',
          rows,
        });
      })
      .catch(err => {
        console.error(err);
        alert('Gagal load data');
      })
      .finally(() => setLoading(false));
  }, [depositId, router]);

  const totalNilai = data?.rows.reduce((s, r) => s + r.nilai_invoice, 0) ?? 0;

  if (loading) return <div className="p-10 text-center text-gray-400">Loading...</div>;
  if (!data) return <div className="p-10 text-center text-red-500">Data tidak ditemukan</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ACTION BAR */}
      <div className="max-w-3xl mx-auto mb-4 flex justify-between items-center print:hidden">
        <button onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100">
          ← Kembali
        </button>
        <button onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          🖨️ Print
        </button>
      </div>

      {/* FAKTUR */}
      <div id="faktur-content" className="max-w-3xl mx-auto bg-white shadow-lg">
        <div className="border-2 border-black">
          <table className="w-full border-collapse" style={{ fontFamily: 'Arial, sans-serif' }}>
            <tbody>

              {/* TITLE */}
              <tr>
                <td colSpan={5} className="border-b-2 border-black p-2 text-center font-bold text-base">
                  TANDA TERIMA FAKTUR
                </td>
              </tr>

              {/* Tanggal */}
              <tr>
                <td className="border border-black p-2 font-semibold bg-gray-100 w-36">Tanggal</td>
                <td className="border border-black p-1 w-4 text-center">:</td>
                <td className="border border-black p-1" colSpan={3}>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={e => setTanggal(e.target.value)}
                    className="w-full px-2 py-1 border-0 focus:outline-none print:border-0"
                  />
                </td>
              </tr>

              {/* Nama Supplier */}
              <tr>
                <td className="border border-black p-2 font-semibold bg-gray-100">Nama Supplier</td>
                <td className="border border-black p-1 text-center">:</td>
                <td className="border border-black p-2 font-semibold" colSpan={3}>
                  {data.supplier_name}
                </td>
              </tr>

              {/* Tanggal Deposit */}
              <tr>
                <td className="border border-black p-2 font-semibold bg-gray-100">Tanggal Deposit</td>
                <td className="border border-black p-1 text-center">:</td>
                <td className="border border-black p-1" colSpan={3}>
                  <input
                    type="date"
                    value={tanggalDeposit}
                    onChange={e => setTanggalDeposit(e.target.value)}
                    className="w-full px-2 py-1 border-0 focus:outline-none print:border-0"
                  />
                </td>
              </tr>

              {/* Invoice label */}
              <tr>
                <td className="border border-black p-2 font-semibold bg-gray-100">Invoice</td>
                <td className="border border-black p-1 text-center">:</td>
                <td colSpan={3} className="border border-black p-1"></td>
              </tr>

              {/* TABLE HEADER */}
              <tr className="bg-gray-100">
                <td className="border border-black p-2 text-center font-semibold w-10">No</td>
                <td className="border border-black p-2 font-semibold">No Sales Order</td>
                <td className="border border-black p-2 font-semibold text-center">Ukuran</td>
                <td className="border border-black p-2 font-semibold text-center">Retur (pcs)</td>
                <td className="border border-black p-2 font-semibold">Nama Toko / Tujuan</td>
                <td className="border border-black p-2 font-semibold text-right">Nilai Invoice</td>
              </tr>

              {/* DATA ROWS */}
              {data.rows.map((r) => (
                <tr key={r.no}>
                  <td className="border border-black p-2 text-center">{r.no}</td>
                  <td className="border border-black p-2">{r.so_number}</td>
                  <td className="border border-black p-2 text-center">{r.ukuran}</td>
                  <td className="border border-black p-2 text-center">{r.retur_pcs > 0 ? r.retur_pcs : '-'}</td>
                  <td className="border border-black p-2">{r.nama_toko}</td>
                  <td className="border border-black p-2 text-right">
                    Rp {r.nilai_invoice.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}

              {/* Empty rows biar ada ruang */}
              {data.rows.length < 8 && Array.from({ length: 8 - data.rows.length }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border border-black p-2">&nbsp;</td>
                  <td className="border border-black p-2"></td>
                  <td className="border border-black p-2"></td>
                  <td className="border border-black p-2"></td>
                  <td className="border border-black p-2"></td>
                  <td className="border border-black p-2"></td>
                </tr>
              ))}

              {/* JUMLAH */}
              <tr>
                <td colSpan={4} className="border border-black p-2"></td>
                <td className="border border-black p-2 font-bold text-right bg-gray-100">Jumlah</td>
                <td className="border border-black p-2 text-right font-bold">
                  Rp {totalNilai.toLocaleString('id-ID')}
                </td>
              </tr>

              {/* SPACER */}
              <tr><td colSpan={6} className="p-2"></td></tr>

              {/* SIGNATURES */}
              <tr>
                <td colSpan={3} className="border border-black p-2 text-center align-top">
                  <div className="mb-12 text-sm">Diserahkan oleh,</div>
                  <div className="border-t border-black inline-block px-10 text-xs"></div>
                </td>
                <td colSpan={3} className="border border-black p-2 text-center align-top">
                  <div className="mb-12 text-sm">Diterima oleh,</div>
                  <div className="border-t border-black inline-block px-10 text-xs"></div>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* PRINT STYLES */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body { background: white !important; margin: 0 !important; }
          body * { visibility: hidden; }
          #faktur-content, #faktur-content * { visibility: visible !important; }
          #faktur-content {
            position: absolute;
            left: 0; top: 0;
            width: 100% !important;
            box-shadow: none;
            font-size: 9pt !important;
          }
          #faktur-content table {
            width: 100% !important;
            font-size: 9pt !important;
            border-collapse: collapse !important;
          }
          #faktur-content td { padding: 3px 5px !important; }
          .print\\:hidden { display: none !important; }
          input { border: none !important; background: transparent !important; }
          table, td { border: 0.5pt solid black !important; }
          .bg-gray-100 { background-color: #f3f4f6 !important; }
          * { color: black !important; -webkit-print-color-adjust: exact !important; }
          .mb-12 { margin-bottom: 30px !important; }
        }
      `}</style>
    </div>
  );
}
