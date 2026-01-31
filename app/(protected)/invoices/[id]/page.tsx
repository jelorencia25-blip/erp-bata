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

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    fetch(`/api/invoices/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    fetch("/api/bank-accounts")
      .then((res) => res.json())
      .then((banks) => {
        setBankAccounts(banks);
        if (banks.length > 0) {
          setSelectedBank(
            `${banks[0].bank_name}|${banks[0].account_number}|${banks[0].account_holder}`
          );
        }
      });
  }, [id]);

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (error || !data)
    return (
      <div className="p-10 text-center">
        <p>{error || "Invoice tidak ditemukan"}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 border border-black"
        >
          Kembali
        </button>
      </div>
    );

  return (
    <div id="print-area" className="max-w-5xl mx-auto p-6 bg-white text-black text-[13px]">
      {/* ACTION BAR */}
      <div className="flex justify-between items-center mb-4 border-b border-black pb-2 print:hidden">
        <button onClick={() => router.back()}>← Kembali</button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 border border-black"
        >
          Print
        </button>
      </div>

      {/* INVOICE */}
      <div className="border border-black p-6">
        {/* HEADER */}
        <div className="border-b-2 border-black pb-3 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold">INVOICE</div>
              <div className="mt-2 space-y-1">
                <div>No SO: <b>{data.so_number}</b></div>
                <div>
                  Tanggal:{" "}
                  {new Date(data.transaction_date).toLocaleDateString("id-ID")}
                </div>
                <div>Toko: <b>{data.kepada}</b></div>
                <div>Alamat: {data.alamat || "-"}</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs">SURAT JALAN</div>
              <div className="text-3xl font-bold">{data.sj_number}</div>
              <div className="mt-2 space-y-1">
                <div>Supplier: <b>{data.supplier_name}</b></div>
                <div>Ref Supplier: <b>{data.customer_ref || "-"}</b></div>
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr>
              {[
                "No",
                "Nama Barang / Ukuran",
                "Isi/Palet",
                "Palet",
                "PCS",
                "Retur",
                "Harga Satuan",
                "Jumlah",
              ].map((h, i) => (
                <th
                  key={i}
                  className="border border-black px-2 py-2 text-center"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.items ?? []).map((it: any, i: number) => (
              <tr key={i}>
                <td className="border border-black text-center">{i + 1}</td>
                <td className="border border-black px-2">
                  <div>{it.product_name}</div>
                  {it.product_size && (
                    <div className="text-xs">({it.product_size})</div>
                  )}
                </td>
                <td className="border border-black text-center">
                  {it.isi_per_palet || "-"}
                </td>
                <td className="border border-black text-center">{it.palet}</td>
                <td className="border border-black text-center">{it.pcs}</td>
                <td className="border border-black text-center">
                  {it.return_pcs || 0}
                </td>
                <td className="border border-black text-right px-2">
                  Rp {(it.harga_satuan || 0).toLocaleString("id-ID")}
                </td>
                <td className="border border-black text-right px-2">
                  Rp {(it.jumlah || 0).toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* FOOTER */}
        <div className="grid grid-cols-2 gap-10 mt-8">
          {/* LEFT */}
          <div>
            <div className="mb-4">
              <div className="font-semibold mb-2">Rekening Transfer</div>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full border border-black p-2"
              >
                {bankAccounts.map((b, i) => (
                  <option
                    key={i}
                    value={`${b.bank_name}|${b.account_number}|${b.account_holder}`}
                  >
                    {b.bank_name} - {b.account_number} - A/N {b.account_holder}
                  </option>
                ))}
              </select>
            </div>

            {/* TERBILANG */}
            <div className="text-sm italic mt-2">
              Terbilang:{" "}
              <b>
                {terbilang(data.total_tagihan || 0)} Rupiah
              </b>
            </div>

            <div className="text-center mt-16">
              <div className="mb-12">Diterima oleh,</div>
              <div className="border-t border-black inline-block min-w-45">
                (Nama & Tanda Tangan)
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div>
            <div className="space-y-2 mb-12">
              <div className="flex justify-between border-b border-black py-1">
                <span>Subtotal</span>
                <span>
                  Rp {(data.subtotal_pembelian ?? 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between border-b border-black py-1">
                <span>Retur</span>
                <span>
                  - Rp {(data.total_retur ?? 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between border border-black py-2 px-2 font-bold text-[15px]">
                <span>TOTAL TAGIHAN</span>
                <span>
                  Rp {(data.total_tagihan ?? 0).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="text-center mt-16">
              <div className="mb-12">Hormat kami,</div>
              <div className="border-t border-black inline-block min-w-45">
                (Nama & Tanda Tangan)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT */}
      <style jsx global>{`
        @media print {
          #print-area {
            transform: scale(0.72);
            transform-origin: top left;
            width: 140%;
          }

          .print\\:hidden {
            display: none !important;
          }
        }

        @page {
          size: A4 portrait;
          margin: 6mm;
        }
      `}</style>
    </div>
  );
}
