'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type BankAccount = {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
};

type DepositPaymentReceipt = {
  id?: string;
  deposit_id: string;
  deposit_code: string;
  payment_date: string;
  supplier_name: string;
  sales_name: string;
  amount: number;
  bank_account_id: string;
  reference_number: string;
  notes: string;
};

export default function DepositPaymentReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const depositId = searchParams.get('deposit_id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  
  const [formData, setFormData] = useState<DepositPaymentReceipt>({
    deposit_id: depositId || '',
    deposit_code: '',
    payment_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    sales_name: '',
    amount: 0,
    bank_account_id: '',
    reference_number: '',
    notes: '',
  });

  // Fetch deposit info
  useEffect(() => {
    if (!depositId) {
      router.push('/deposits');
      return;
    }

    Promise.all([
      fetch(`/api/deposits/${depositId}`),
      fetch('/api/bank-accounts'),
    ])
      .then(([depositRes, bankRes]) =>
        Promise.all([depositRes.json(), bankRes.json()])
      )
      .then(([depositData, bankData]) => {
        const deposit = depositData.deposit;
        const payments = depositData.payments || [];
        
        // Get last payment amount or 0
        const lastPaymentAmount = payments.length > 0 
          ? payments[0].amount 
          : 0;
        
        // Build deposit description with proper format
        // Example: "DEPOSIT 5 DO 425000/m3 (12.6 m3/DO) FRANCO"
        const doCount = deposit.total_do_tagged;
        const pricePerM3 = deposit.price_lock_per_m3;
        const notes = deposit.notes || '';
        
        const depositDescription = `DEPOSIT ${doCount} DO ${pricePerM3.toLocaleString('id-ID')}/m3${notes ? ` ${notes}` : ''}`;
        
        setFormData((prev) => ({
          ...prev,
          deposit_code: deposit.deposit_code,
          supplier_name: deposit.customer_name,
          notes: depositDescription, // Auto-fill with full description
          amount: lastPaymentAmount, // Auto-fill with last payment or 0
        }));
        
        setBankAccounts(bankData);
        if (bankData.length > 0) {
          setFormData((prev) => ({
            ...prev,
            bank_account_id: bankData[0].id,
          }));
        }
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        alert('Failed to load deposit data');
      })
      .finally(() => setLoading(false));
  }, [depositId, router]);

  const handleSave = async () => {
    if (!formData.amount || formData.amount <= 0) {
      alert('Masukkan jumlah pembayaran yang valid');
      return;
    }

    if (!formData.sales_name.trim()) {
      alert('Masukkan nama sales');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/deposits/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deposit_id: formData.deposit_id,
          amount: formData.amount,
          payment_date: formData.payment_date,
          payment_method: 'Transfer',
          reference_number: formData.reference_number,
          notes: `${formData.notes}\nSales: ${formData.sales_name}`,
        }),
      });

      if (!res.ok) throw new Error('Failed to save payment');

      alert('Pembayaran berhasil disimpan!');
      router.push('/deposits');
    } catch (err: any) {
      console.error('Save error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  const selectedBank = bankAccounts.find((b) => b.id === formData.bank_account_id);
  const amountInWords = numberToWords(formData.amount);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ACTION BAR */}
      <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center print:hidden">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
        >
          ← Kembali
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : '💾 Simpan'}
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* RECEIPT - Excel Style */}
      <div
        id="receipt-content"
        className="max-w-4xl mx-auto bg-white shadow-lg"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* HEADER */}
        <div className="border-2 border-black">
          <table className="w-full">
            <tbody>
              {/* TITLE */}
              <tr>
                <td
                  colSpan={6}
                  className="border-b-2 border-black p-2 text-center font-bold text-lg"
                >
                  TANDA TERIMA PEMBAYARAN
                </td>
              </tr>

              {/* ROW 1: Tanggal */}
              <tr>
                <td className="border border-black p-2 font-semibold bg-gray-100 w-32">
                  Tanggal
                </td>
                <td className="border border-black p-1" colSpan={5}>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_date: e.target.value })
                    }
                    className="w-full px-2 py-1 border-0 focus:outline-none print:border-0"
                  />
                </td>
              </tr>

              {/* ROW 2: Nama Supplier */}
              <tr>
                <td className="border border-black p-2 font-semibold bg-gray-100">
                  Nama Supplier
                </td>
                <td className="border border-black p-2" colSpan={5}>
                  {formData.supplier_name}
                </td>
              </tr>

              {/* ROW 3: SALES */}
              <tr>
                <td className="border border-black p-2 font-semibold bg-gray-100">
                  SALES
                </td>
                <td className="border border-black p-1" colSpan={5}>
                  <input
                    type="text"
                    value={formData.sales_name}
                    onChange={(e) =>
                      setFormData({ ...formData, sales_name: e.target.value })
                    }
                    placeholder="Nama Sales"
                    className="w-full px-2 py-1 border-0 focus:outline-none print:border-0"
                  />
                </td>
              </tr>

              {/* SPACER */}
              <tr>
                <td colSpan={6} className="p-1"></td>
              </tr>

              {/* ROW 4: Intro text */}
              <tr>
                <td colSpan={6} className="border border-black p-2">
                  Menyatakan dengan sebenarnya bahwa telah menerima pembayaran:
                </td>
              </tr>

              {/* ROW 5: Detail header */}
              <tr>
                <td className="border border-black p-2 text-center font-semibold bg-gray-100">
                  No
                </td>
                <td
                  className="border border-black p-2 font-semibold bg-gray-100"
                  colSpan={2}
                >
                  DEPOSIT {formData.deposit_code}
                </td>
                <td className="border border-black p-2 text-center font-semibold bg-gray-100">
                  Qty
                </td>
                <td className="border border-black p-2 text-center font-semibold bg-gray-100">
                  Rp
                </td>
                <td className="border border-black p-2 text-center font-semibold bg-gray-100">
                  Rp
                </td>
              </tr>

              {/* ROW 6: Amount */}
              <tr>
                <td className="border border-black p-2 text-center">1</td>
                <td className="border border-black p-2" colSpan={2}>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Keterangan (opsional)"
                    className="w-full px-2 py-1 border-0 focus:outline-none print:border-0"
                  />
                </td>
                <td className="border border-black p-2 text-center">1</td>
                <td className="border border-black p-1 text-right">
                  <input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-2 py-1 text-right border-0 focus:outline-none print:border-0"
                  />
                </td>
                <td className="border border-black p-2 text-right font-semibold">
                  {formData.amount.toLocaleString('id-ID')}
                </td>
              </tr>

              {/* SPACER */}
              <tr>
                <td colSpan={6} className="p-1"></td>
              </tr>

              {/* ROW 7: Total - 1 ROW ONLY */}
              <tr>
                <td colSpan={3}></td>
                <td className="border border-black p-2 text-right font-semibold bg-gray-100">
                  Jumlah
                </td>
                <td className="border-2 border-black p-2 text-right font-bold" colSpan={2}>
                  Rp {formData.amount.toLocaleString('id-ID')}
                </td>
              </tr>

              {/* SPACER */}
              <tr>
                <td colSpan={6} className="p-1"></td>
              </tr>

              {/* ROW 8: Terbilang */}
              <tr>
                <td
                  colSpan={6}
                  className="border border-black p-2 italic font-semibold"
                >
                  Terbilang: {amountInWords}
                </td>
              </tr>

              {/* ROW 9: Transfer - SUPER BESAR */}
              <tr>
                <td
                  colSpan={6}
                  className="border border-black p-3 text-lg font-extrabold"
                  style={{ fontSize: '14pt', lineHeight: '1.3' }}
                >
                  <div className="print:hidden mb-2">
                    <select
                      value={formData.bank_account_id}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_account_id: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bank_name} - {b.account_number} - A/N {b.account_holder}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="print:block uppercase">
                    tranfer ke rek {selectedBank?.bank_name}{' '}
                    {selectedBank?.account_number} A/N {selectedBank?.account_holder}
                  </div>
                </td>
              </tr>

              {/* ROW 10: Reference (editable) */}
              <tr>
                <td colSpan={6} className="border border-black p-1">
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) =>
                      setFormData({ ...formData, reference_number: e.target.value })
                    }
                    placeholder="Nomor referensi transfer (opsional)"
                    className="w-full px-2 py-1 border-0 focus:outline-none print:border-0 text-sm"
                  />
                </td>
              </tr>

              {/* SPACER */}
              <tr>
                <td colSpan={6} className="p-1"></td>
              </tr>

              {/* ROW 11: Signatures */}
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

            {/* PRINT STYLES - FINAL FIX */}
      <style jsx global>{`
        @media print {
          @page {
            size: A5 portrait;
            margin: 6mm;
          }

          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body * {
            visibility: hidden;
          }

          #receipt-content,
          #receipt-content * {
            visibility: visible !important;
          }

          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 136mm !important;
            height: auto;
            box-shadow: none;
            font-size: 8.5pt !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
          }

          #receipt-content table {
            width: 100% !important;
            font-size: 8pt !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }

          #receipt-content td {
            padding: 2px 3px !important;
            word-wrap: break-word !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
            line-height: 1.2 !important;
          }

          #receipt-content .text-lg {
            font-size: 11pt !important;
            font-weight: bold !important;
          }

          #receipt-content td.font-extrabold,
          #receipt-content td.text-lg.font-extrabold {
            font-size: 12pt !important;
            font-weight: 900 !important;
            line-height: 1.4 !important;
            padding: 4px 5px !important;
          }

          #receipt-content .uppercase {
            text-transform: uppercase !important;
          }

          #receipt-content .text-sm {
            font-size: 7.5pt !important;
          }

          #receipt-content .mb-12 {
            margin-bottom: 25px !important;
          }

          #receipt-content td.w-32 {
            width: 30mm !important;
          }

          .print\:hidden {
            display: none !important;
            visibility: hidden !important;
          }

          .print\:block {
            display: block !important;
            visibility: visible !important;
          }

          input, select {
            border: none !important;
            outline: none !important;
            -webkit-appearance: none;
            appearance: none;
            background: transparent !important;
          }

          table, th, td {
            border: 0.5pt solid black !important;
          }

          #receipt-content > div {
            border: 1.5pt solid black !important;
          }

          * {
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .bg-gray-100 {
            background-color: #f3f4f6 !important;
          }

          .font-bold {
            font-weight: 700 !important;
          }

          .font-semibold {
            font-weight: 600 !important;
          }

          .font-extrabold {
            font-weight: 900 !important;
          }

          .italic {
            font-style: italic !important;
          }
        }
      `}</style>

    </div>
  );
}

// Helper: Convert number to Indonesian words
function numberToWords(num: number): string {
  if (num === 0) return 'Nol Rupiah';

  const ones = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  function convert(n: number): string {
    if (n < 12) return ones[n];
    if (n < 20) return ones[n - 10] + ' Belas';
    if (n < 100)
      return ones[Math.floor(n / 10)] + ' Puluh ' + convert(n % 10);
    if (n < 200) return 'Seratus ' + convert(n - 100);
    if (n < 1000)
      return ones[Math.floor(n / 100)] + ' Ratus ' + convert(n % 100);
    if (n < 2000) return 'Seribu ' + convert(n - 1000);
    if (n < 1000000)
      return convert(Math.floor(n / 1000)) + ' Ribu ' + convert(n % 1000);
    if (n < 1000000000)
      return (
        convert(Math.floor(n / 1000000)) + ' Juta ' + convert(n % 1000000)
      );
    return n.toString();
  }

  return convert(Math.floor(num)) + ' Rupiah';
}
