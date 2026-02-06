"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

/* ================= TERBILANG ================= */
function terbilang(n: number): string {
  const angka = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];

  if (n < 12) return angka[n];
  if (n < 20) return angka[n - 10] + " Belas";
  if (n < 100)
    return (
      angka[Math.floor(n / 10)] +
      " Puluh " +
      terbilang(n % 10)
    );
  if (n < 200) return "Seratus " + terbilang(n - 100);
  if (n < 1000)
    return (
      angka[Math.floor(n / 100)] +
      " Ratus " +
      terbilang(n % 100)
    );
  if (n < 2000) return "Seribu " + terbilang(n - 1000);
  if (n < 1000000)
    return (
      terbilang(Math.floor(n / 1000)) +
      " Ribu " +
      terbilang(n % 1000)
    );
  if (n < 1000000000)
    return (
      terbilang(Math.floor(n / 1000000)) +
      " Juta " +
      terbilang(n % 1000000)
    );

  return "";
}
/* ============================================= */

type BankAccount = {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
};

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  
  // Editable fields
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch invoice data
  useEffect(() => {
    if (!id) return;

    fetch(`/api/invoices/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((json) => {
        setData(json);
        // Set initial date
        const date = new Date(json.transaction_date);
        setSelectedDate(date.toISOString().split('T')[0]);
        
        // Set initial bank account from saved data
        if (json.bank_account_id) {
          setSelectedBank(json.bank_account_id);
        }
        
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  // Fetch bank accounts
  useEffect(() => {
    fetch("/api/bank-accounts")
      .then((res) => res.json())
      .then((banks) => {
        console.log("Bank accounts loaded:", banks);
        setBankAccounts(banks);
        // Only set default if no saved bank account from invoice data
        if (banks.length > 0 && !data?.bank_account_id) {
          setSelectedBank(banks[0].id);
        }
      })
      .catch(err => console.error("Error fetching banks:", err));
  }, [data]);

  // Handle save invoice
  const handleSaveInvoice = async () => {
    if (!selectedBank) {
      alert("Pilih rekening terlebih dahulu");
      return;
    }

    console.log("Saving invoice with bank_account_id:", selectedBank); // Debug log

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        transaction_date: selectedDate,
        bank_account_id: selectedBank,
      };
      
      console.log("Payload being sent:", payload); // Debug log

      const response = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save invoice');
      }

      setSaveSuccess(true);
      
      // Refresh data
      const updatedData = await response.json();
      setData(updatedData);

      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Save error details:", err); // Debug log
      alert(`Error saving invoice: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (error || !data)
    return (
      <div className="p-10 text-center">
        <p>{error || "Invoice tidak ditemukan"}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 border border-black hover:bg-gray-100"
        >
          Kembali
        </button>
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white">
      {/* ACTION BAR */}
      <div className="flex justify-between items-center mb-4 border-b border-black pb-4 print:hidden">
        <button 
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 hover:bg-gray-100 rounded"
        >
          ← Kembali
        </button>
        
        <div className="flex gap-2">
          {saveSuccess && (
            <div className="px-4 py-2 bg-green-100 text-green-800 border border-green-300 rounded">
              ✓ Invoice berhasil disimpan!
            </div>
          )}
          <button
            onClick={handleSaveInvoice}
            disabled={isSaving}
            className="px-4 py-2 bg-green-600 text-white border border-green-700 hover:bg-green-700 disabled:bg-gray-400 rounded"
          >
            {isSaving ? "Saving..." : "💾 Save Invoice"}
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 border border-black hover:bg-gray-100 rounded"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* INVOICE */}
      <div id="print-content" className="border-2 border-black p-4">
        {/* TITLE */}
        <div className="text-2xl font-bold mb-3 text-center">
          INVOICE <span className="font-normal">{data.sj_number}</span>
        </div>

        {/* HEADER - Compact 3 Columns */}
        <div className="grid grid-cols-3 gap-4 border-b-2 border-black pb-2 mb-3">
          {/* LEFT - Invoice Info */}
          <div className="space-y-1">
            <div className="flex gap-2">
              <span className="font-bold">No SO:</span>
              <span>{data.so_number}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="font-bold">Tanggal:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 px-2 py-0.5 rounded text-sm print:border-0 print:p-0"
              />
            </div>
          </div>

          {/* CENTER - Store Info */}
          <div>
            <div>
              <span className="font-bold">Toko: </span>
              <span className="font-semibold">{data.kepada}</span>
            </div>
            <div>
              <span className="font-bold">Alamat: </span>
              <span className="text-gray-600">{data.alamat || "-"}</span>
            </div>
          </div>

          {/* RIGHT - Supplier */}
          <div className="text-right">
            <div>
              <span className="font-bold">Supplier: </span>
              <span className="font-semibold">{data.supplier_name}</span>
            </div>
            <div>
              <span className="font-bold">Ref: </span>
              <span>{data.customer_ref || "-"}</span>
            </div>
          </div>
        </div>

        {/* TABLE - Compact */}
        <table className="w-full border-collapse border-2 border-black mb-3">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="border border-black px-2 py-1 text-center w-8">No</th>
              <th className="border border-black px-2 py-1 text-left">Barang / Ukuran</th>
              <th className="border border-black px-2 py-1 text-center w-16">Isi/Palet</th>
              <th className="border border-black px-2 py-1 text-center w-16">Palet</th>
              <th className="border border-black px-2 py-1 text-center w-16">PCS</th>
              <th className="border border-black px-2 py-1 text-center w-16">Retur</th>
              <th className="border border-black px-2 py-1 text-right w-24">Harga</th>
              <th className="border border-black px-2 py-1 text-right w-28">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {(data.items ?? []).map((it: any, i: number) => (
              <tr key={i}>
                <td className="border border-black text-center py-1">{i + 1}</td>
                <td className="border border-black px-2 py-1">
                  {it.product_name}
                  {it.product_size && <span className="text-sm text-gray-600"> ({it.product_size})</span>}
                </td>
                <td className="border border-black text-center">{it.isi_per_palet || "-"}</td>
                <td className="border border-black text-center">{it.palet}</td>
                <td className="border border-black text-center">{it.pcs}</td>
                <td className="border border-black text-center">{it.return_pcs || 0}</td>
                <td className="border border-black text-right px-2">
                  {(it.harga_satuan || 0).toLocaleString("id-ID")}
                </td>
                <td className="border border-black text-right px-2 font-semibold">
                  {(it.jumlah || 0).toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* FOOTER - 2 Columns */}
        <div className="grid grid-cols-2 gap-8 mt-4">
          {/* LEFT - Bank & Signature */}
          <div className="flex flex-col">
            {/* REKENING TRANSFER - Content gede, label kecil */}
           {/* REKENING TRANSFER FIXED */}
{/* DROPDOWN UNTUK EDIT */}
<div className="mb-3 border-2 border-black p-2 print:hidden">
  <select
    value={selectedBank || ""}
    onChange={(e) => setSelectedBank(e.target.value)}
    className="w-full border border-black p-1.5 text-sm font-bold"
  >
    <option value="">-- Pilih Rekening --</option>
    {bankAccounts.map((b) => (
      <option key={b.id} value={b.id}>
        {b.bank_name} - {b.account_number} - A/N {b.account_holder}
      </option>
    ))}
  </select>
</div>

{/* REKENING TRANSFER FIXED UNTUK PRINT */}
<div className="mb-3 border-2 border-black p-2">
  <table className="w-full border-collapse">
    <tbody>
      <tr>
        <td className="font-bold">
          {bankAccounts.length > 0 && selectedBank
            ? `${bankAccounts.find(b => b.id === selectedBank)?.bank_name} – ${bankAccounts.find(b => b.id === selectedBank)?.account_number}`
            : "BCA – NOREK" /* fallback */}
        </td>
      </tr>
      <tr>
        <td className="font-bold">
          {bankAccounts.length > 0 && selectedBank
            ? `A/N ${bankAccounts.find(b => b.id === selectedBank)?.account_holder}`
            : "A/N" /* fallback */}
        </td>
      </tr>
    </tbody>
  </table>
</div>



            {/* TERBILANG - Lebih besar */}
            <div className="text-base italic mb-3 font-semibold">
              <span className="font-bold">Terbilang: </span>
              {terbilang(data.total_tagihan || 0)} Rupiah
            </div>

            {/* Signature - Flex grow to push to bottom */}
            <div className="text-center mt-auto pt-8">
              <div className="mb-12 font-semibold">Diterima oleh,</div>
              <div className="border-t border-black inline-block min-w-50 pt-1">
                (Nama & Tanda Tangan)
              </div>
            </div>
          </div>

          {/* RIGHT - Totals & Signature */}
          <div className="flex flex-col">
            {/* Totals - Compact */}
            <div className="space-y-1 mb-3">
              <div className="flex justify-between py-1 border-b border-gray-300">
                <span>Subtotal</span>
                <span className="font-semibold">
                  Rp {(data.subtotal_pembelian ?? 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-300">
                <span>Retur</span>
                <span className="font-semibold text-red-600">
                  - Rp {(data.total_retur ?? 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between border-2 border-black py-2 px-3 font-bold text-base bg-gray-100">
                <span>TOTAL TAGIHAN</span>
                <span>
                  Rp {(data.total_tagihan ?? 0).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Signature - Flex grow to push to bottom */}
            <div className="text-center mt-auto pt-8">
              <div className="mb-12 font-semibold">Hormat kami,</div>
              <div className="border-t border-black inline-block min-w-50 pt-1">
                (Nama & Tanda Tangan)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT STYLES */}
      <style jsx global>{`

@media print {

  /* ================= PAGE ================= */
  @page {
    size: A4 portrait;
    margin: 14mm 12mm 18mm 12mm;
  }

  body {
    font-family: "Courier New", Courier, monospace !important;
    color: #000 !important; /* pitch black text */
    background: #fff !important; /* ensure white background */
  }

  body * {
    visibility: hidden; /* hide everything by default */
  }

  #print-content,
  #print-content * {
    visibility: visible;
    color: #000 !important; /* force pitch black */
    font-weight: 700 !important; /* max bold */
  }

  #print-content {
    position: absolute;
    inset: 0;
    padding: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
    border: 1.5pt solid #000 !important;
    font-size: 12pt !important;
    line-height: 1.2 !important;
    background: #fff !important;
  }

  /* ================= TITLE ================= */
  #print-content .text-2xl {
    font-size: 16pt !important;
    font-weight: 700 !important;
    margin-bottom: 6pt !important;
    color: #000 !important;
  }

  /* ================= HEADER ================= */
  #print-content .border-b-2 {
    border-bottom: 1.5pt solid #000 !important;
  }

  #print-content .font-bold {
    font-weight: 700 !important;
    color: #000 !important;
  }

  /* ================= TABLE ================= */
  table {
    width: 100% !important;
    border-collapse: collapse !important;
    font-size: 11.5pt !important;
    color: #000 !important;
    background: #fff !important;
  }

  th,
  td,
  th *,
  td * {
    border: 1pt solid #000 !important;
    padding: 3pt 4pt !important;
    vertical-align: middle !important;
    color: #000 !important;
    font-weight: 700 !important;
    background: #fff !important;
  }

  th {
    text-align: center !important;
  }

  thead {
    background: #fff !important;
  }

  /* ================= TERBILANG ================= */
  #print-content .italic {
    font-style: italic !important;
    font-weight: 700 !important; /* still normal for terbilang */
    color: #000 !important;
  }

  #print-content .italic .font-bold {
    font-weight: 700 !important;
  }

  /* ================= TOTAL ================= */
  #print-content .border-2.border-black {
    border: 1.5pt solid #000 !important;
    background: #fff !important;
    color: #000 !important;
    font-weight: 700 !important;
  }

  /* ================= REKENING TRANSFER ================= */
  #print-content .rekening-transfer {
    font-size: 10pt !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    white-space: normal !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
    padding: 8pt 10pt !important;
    margin-top: 6pt !important;
    page-break-inside: avoid !important;
    color: #000 !important;
    background: #fff !important;
  }

  #print-content .rekening-transfer * {
    font-size: inherit !important;
    font-weight: inherit !important;
    color: #000 !important;
  }

  /* ================= SIGNATURE ================= */
  .signature-box {
    min-height: 70pt !important;
    padding-top: 10pt !important;
    text-align: center !important;
    color: #000 !important;
  }

  .signature-line {
    display: inline-block !important;
    min-width: 160pt !important;
    border-top: 1pt solid #000 !important;
    padding-top: 2pt !important;
    font-size: 8pt !important;
    color: #000 !important;
  }

  /* ================= FORM ELEMENT ================= */
  select,
  input {
    border: none !important;
    padding: 0 !important;
    appearance: none !important;
    background: transparent !important;
    color: #000 !important;
    font-weight: 700 !important;
  }

  /* ================= UTILITY ================= */
  .print\\:hidden {
    display: none !important;
  }

}


`}</style>

    </div>
  );
}
