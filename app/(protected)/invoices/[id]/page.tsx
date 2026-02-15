"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  const [isDownloading, setIsDownloading] = useState(false);

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

    console.log("Saving invoice with bank_account_id:", selectedBank);

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        transaction_date: selectedDate,
        bank_account_id: selectedBank,
      };
      
      console.log("Payload being sent:", payload);

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
      console.error("Save error details:", err);
      alert(`Error saving invoice: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle download PDF - Fixed untuk tidak terpotong
  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    
    try {
      const element = document.getElementById('print-content');
      if (!element) {
        throw new Error('Print content not found');
      }

      // Sembunyikan dropdown
      const dropdown = element.querySelector('.print\\:hidden');
      if (dropdown) {
        (dropdown as HTMLElement).style.display = 'none';
      }

      // Clone element untuk manipulation
      const clone = element.cloneNode(true) as HTMLElement;
      
      // Set explicit width untuk prevent overflow
      clone.style.width = '210mm'; // A4 width
      clone.style.maxWidth = '210mm';
      clone.style.boxSizing = 'border-box';
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.backgroundColor = '#ffffff';
      
      document.body.appendChild(clone);

      // Force safe colors di clone
      const replaceColors = (el: Element) => {
        if (el instanceof HTMLElement) {
          el.style.setProperty('color', '#000000', 'important');
          el.style.setProperty('border-color', '#000000', 'important');
          
          const bgColor = window.getComputedStyle(el).backgroundColor;
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            el.style.setProperty('background-color', '#ffffff', 'important');
          }
          
          if (el.tagName === 'THEAD' || el.classList.contains('bg-gray-800')) {
            el.style.setProperty('background-color', '#e5e7eb', 'important');
            el.style.setProperty('color', '#000000', 'important');
          }

          if (el.classList.contains('bg-gray-100')) {
            el.style.setProperty('background-color', '#f3f4f6', 'important');
          }
        }
        
        Array.from(el.children).forEach(replaceColors);
      };
      
      replaceColors(clone);

      // Capture dengan settings optimal
      const canvas = await html2canvas(clone, {
        scale: 2, // High quality
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
        foreignObjectRendering: false,
        imageTimeout: 0,
        removeContainer: false
      });

      // Remove clone
      document.body.removeChild(clone);

      // Restore dropdown
      if (dropdown) {
        (dropdown as HTMLElement).style.display = '';
      }

      // Generate PDF dengan proper sizing
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate image dimensions to fit A4
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const xOffset = 10; // Center with 10mm margin
      let yOffset = 10;

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png', 0.95);
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight, undefined, 'FAST');

      // Check if need multiple pages
      let heightLeft = imgHeight - (pdfHeight - 20);
      
      while (heightLeft > 0) {
        pdf.addPage();
        yOffset = -heightLeft + 10;
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= (pdfHeight - 20);
      }

      // Generate filename
      const fileName = `Invoice_${data.sj_number}_${data.kepada}`.replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf';
      
      // Download
      pdf.save(fileName);
      
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      
      const errorMsg = err.message.includes('lab') 
        ? 'Browser color format tidak support.'
        : `Error: ${err.message}`;
      
      alert(`Gagal download PDF.\n\n${errorMsg}\n\nAlternatif: Gunakan tombol Print (🖨️) lalu pilih "Save as PDF" di dialog.`);
    } finally {
      setIsDownloading(false);
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
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="px-4 py-2 bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 disabled:bg-gray-400 rounded"
          >
            {isDownloading ? "⏳ Downloading..." : "📥 Download PDF"}
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
      <div id="print-content" className="border-2 border-black p-4" style={{
        colorScheme: 'light',
        color: 'rgb(0, 0, 0)',
        backgroundColor: 'rgb(255, 255, 255)'
      }}>
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
              <span className="print:inline hidden">{selectedDate}</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 px-2 py-0.5 rounded text-sm print:hidden"
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
        <table className="w-full border-collapse border-2 border-black mb-3" style={{
          color: 'rgb(0, 0, 0)',
          backgroundColor: 'rgb(255, 255, 255)',
          borderColor: 'rgb(0, 0, 0)'
        }}>
          <thead className="bg-gray-800 text-white print:bg-white print:text-black" style={{
            color: 'rgb(255, 255, 255)',
            backgroundColor: 'rgb(31, 41, 55)'
          }}>
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
            : "BCA – NOREK"}
        </td>
      </tr>
      <tr>
        <td className="font-bold">
          {bankAccounts.length > 0 && selectedBank
            ? `A/N ${bankAccounts.find(b => b.id === selectedBank)?.account_holder}`
            : "A/N"}
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
              <div className="flex justify-between border-2 border-black py-2 px-3 font-bold text-base bg-gray-100 print:bg-white">
                <span>TOTAL TAGIHAN</span>
                <span>
                  Rp {(data.total_tagihan ?? 0).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Signature - Flex grow to push to bottom */}
            <div className="text-center mt-auto pt-8">
              <div className="mb-12 font-semibold">Hormat kami,</div>
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
    color: #000 !important;
    background: #fff !important;
  }

  body * {
    visibility: hidden;
  }

  #print-content,
  #print-content * {
    visibility: visible;
    color: #000 !important;
    font-weight: 300 !important;
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
    font-weight: 300 !important;
    margin-bottom: 6pt !important;
    color: #000 !important;
  }

  /* ================= HEADER ================= */
  #print-content .border-b-2 {
    border-bottom: 1.5pt solid #000 !important;
  }

  #print-content .font-bold {
    font-weight: 300 !important;
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
    font-weight: 300 !important;
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
    font-weight: 300 !important;
    color: #000 !important;
  }

  #print-content .italic .font-bold {
    font-weight: 300 !important;
  }

  /* ================= TOTAL ================= */
  #print-content .border-2.border-black {
    border: 1.5pt solid #000 !important;
    background: #fff !important;
    color: #000 !important;
    font-weight: 300 !important;
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
  
  .print\\:inline {
    display: inline !important;
  }
  
  .print\\:bg-white {
    background: #fff !important;
  }
  
  .print\\:text-black {
    color: #000 !important;
  }

}

`}</style>

    </div>
  );
}
