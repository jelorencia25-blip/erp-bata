"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* ======================
   Helper Rupiah
====================== */
const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n || 0);

/* ======================
   Types
====================== */
type Suppliers = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  ukuran: string;
  kubik_m3: number;
  isi_per_palet: number;
  jumlah_palet: number;
  status: string;
};

type Deposit = {
  id: string;
  deposit_code: string;
  price_lock_per_m3: number;
  do_remaining: number;
};

type SalesOrderItem = {
  product_id: string;
  is_non_m3: boolean;
  m3: number;
  pallet_size: number;
  qty_pallet: number;
  qty_pcs: number;
  price_m3: number;
  unit_price: number;
  total: number;
};

/* ======================
   Form Row
====================== */
function FormRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center mb-3">
      <div className="w-40 font-medium text-gray-700">{label}:</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* ======================
   Empty item factory
====================== */
const emptyItem = (): SalesOrderItem => ({
  product_id: "",
  is_non_m3: false,
  m3: 0,
  pallet_size: 0,
  qty_pallet: 0,
  qty_pcs: 0,
  price_m3: 0,
  unit_price: 0,
  total: 0,
});

export default function AddSalesOrderPage() {
  const router = useRouter();

  const [soNumber, setSoNumber] = useState("");
  const [date, setDate] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [purchaseType, setPurchaseType] = useState<"Franco" | "Locco">("Franco");
  const [notes, setNotes] = useState("");

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);

  /* ======================
     MASTER DATA
  ====================== */
  const [suppliers, setSuppliers] = useState<Suppliers[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  /* ======================
     HEADER FORM STATE
  ====================== */
  const [form, setForm] = useState({
    ref_customer: "",
    note: "",
    to: "",
    phone: "",
    address: "",
  });

  /* ======================
     DETAIL BARANG STATE
  ====================== */
  const [items, setItems] = useState<SalesOrderItem[]>([emptyItem()]);

  /* ======================
     HANDLE SELECT DEPOSIT
     → auto-fill price_m3 ke semua item yg belum diisi
  ====================== */
  const handleSelectDeposit = (deposit: Deposit | null) => {
    if (!deposit) return;

    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        // Jangan overwrite kalau user sudah isi manual
        price_m3:
          item.price_m3 && item.price_m3 > 0
            ? item.price_m3
            : deposit.price_lock_per_m3,
      }))
    );
  };

  /* ======================
     INIT
  ====================== */
  useEffect(() => {
    setDate(new Date().toISOString().split("T")[0]);
  }, []);

  /* ======================
     FETCH SUPPLIERS
  ====================== */
  useEffect(() => {
    const fetchSuppliers = async () => {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      console.log("RAW SUPPLIER API RESPONSE:", data);
      setSuppliers(data);
    };
    fetchSuppliers();
  }, []);

  /* ======================
     FETCH PRODUCTS
  ====================== */
  useEffect(() => {
    const fetchProducts = async () => {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    };
    fetchProducts();
  }, []);

  /* ======================
     FETCH DEPOSITS (per supplier)
  ====================== */
  useEffect(() => {
    if (!selectedSupplierId) {
      setDeposits([]);
      setSelectedDepositId(null);
      return;
    }

    const fetchDeposits = async () => {
      const res = await fetch(
        `/api/deposits/active?customer_id=${selectedSupplierId}`
      );
      const data = await res.json();
      setDeposits(data);
    };

    fetchDeposits();
  }, [selectedSupplierId]);

  /* ======================
     AUTO-FILL HARGA DARI DEPOSIT
  ====================== */
  useEffect(() => {
    const dep = deposits.find((d) => d.id === selectedDepositId) ?? null;
    handleSelectDeposit(dep);
  }, [selectedDepositId]);

  /* ======================
     SELECT PRODUK
  ====================== */
  const handleSelectProduct = (idx: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;

    const isNonM3 = !p.kubik_m3 || p.kubik_m3 === 0;

    // Ambil price_m3 dari deposit yang aktif (kalau ada)
    const depositPrice =
      deposits.find((d) => d.id === selectedDepositId)?.price_lock_per_m3 ?? 0;

    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = {
        product_id: p.id,
        is_non_m3: isNonM3,
        m3: isNonM3 ? 0 : p.kubik_m3,
        pallet_size: isNonM3 ? 0 : p.isi_per_palet,
        qty_pallet: isNonM3 ? 0 : 1,
        qty_pcs: isNonM3 ? 0 : p.isi_per_palet,
        // kalau ada deposit aktif, pakai harga deposit sebagai default
        price_m3: isNonM3 ? 0 : (copy[idx]?.price_m3 > 0 ? copy[idx].price_m3 : depositPrice),
        unit_price: 0,
        total: 0,
      };
      return copy;
    });
  };

  /* ======================
     UPDATE ITEM
  ====================== */
  const updateItem = (idx: number, field: string, value: any) => {
    const copy = [...items];
    // @ts-ignore
    copy[idx][field] = value;

    if (copy[idx].is_non_m3) {
      // NON-M3: total diinput langsung, field lain 0
      copy[idx].m3 = 0;
      copy[idx].qty_pcs = 0;
      copy[idx].qty_pallet = 0;
      copy[idx].unit_price = 0;
      copy[idx].price_m3 = 0;
    } else {
      // NORMAL: formula m3
      const qtyPalet = Number(copy[idx].qty_pallet) || 0;
      const isiPerPalet = Number(copy[idx].pallet_size) || 0;
      const priceM3 = Number(copy[idx].price_m3) || 0;

      const m3PerPallet = 1.8;
      const totalM3 = m3PerPallet * qtyPalet;
      copy[idx].m3 = totalM3;

      const qtyPcs = qtyPalet * isiPerPalet;
      copy[idx].qty_pcs = qtyPcs;

      const unitPrice = qtyPcs > 0 ? (priceM3 * totalM3) / qtyPcs : 0;
      copy[idx].unit_price = unitPrice;

      copy[idx].total = priceM3 * totalM3;
    }

    setItems(copy);
  };

  const grandTotal = items.reduce((s, i) => s + i.total, 0);

  /* ======================
     SAVE
  ====================== */
  const handleSave = async () => {
    if (!selectedSupplierId) {
      alert("Supplier wajib dipilih");
      return;
    }

    if (!/^[0-9a-f-]{36}$/i.test(selectedSupplierId)) {
      alert("Supplier ID INVALID (bukan UUID)");
      console.error("BAD SUPPLIER ID:", selectedSupplierId);
      return;
    }

    console.log("FINAL selectedSupplierId:", selectedSupplierId);

    // 1 SO = 1 DO
    const selectedDeposit = deposits.find((d) => d.id === selectedDepositId);
    const depositDoUsed = selectedDeposit ? 1 : 0;
    const depositAmountUsed = selectedDeposit ? grandTotal : 0;

    const validItems = items.filter((i) => i.product_id);
    if (!validItems.length) {
      alert("Minimal satu produk harus diisi");
      return;
    }

    const payload = {
      customer_id: selectedSupplierId,
      order_date: date,
      ship_to_name: form.to || null,
      contact_phone: form.phone || null,
      delivery_address: form.address || null,
      customer_order_ref: form.ref_customer || "",
      purchase_type: purchaseType,
      notes: notes,

      items: validItems.map((i) => ({
        product_id: i.product_id,
        // 🔥 FIX: pallet_qty CHECK > 0, kirim 1 untuk non-m3
        pallet_qty: i.is_non_m3 ? 1 : Number(i.qty_pallet),
        total_pcs: i.is_non_m3 ? 0 : Number(i.qty_pcs),
        price_per_m3: i.is_non_m3 ? 0 : Number(i.price_m3),
        total_price: Number(i.total),
        total_m3: i.is_non_m3 ? 0 : Number(i.m3),
      })),

      // DEPOSIT
      deposit_id: selectedDepositId || null,
      deposit_do_used: depositDoUsed,
      deposit_amount_used: depositAmountUsed,
    };

    console.log("FINAL PAYLOAD:", JSON.stringify(payload, null, 2));
    console.log("DEPOSIT DATA:", {
      deposit_id: payload.deposit_id,
      do_used: payload.deposit_do_used,
      amount_used: payload.deposit_amount_used,
    });

    try {
      const res = await fetch("/api/salesorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal simpan Sales Order");

      alert("Sales Order berhasil disimpan!");
      router.push("/salesorders");
    } catch (err: any) {
      alert(err.message);
    }
  };

  /* ======================
     RENDER
  ====================== */
  return (
    <div className="page-wrapper p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            className="p-2 bg-gray-200 rounded hover:bg-gray-300"
            onClick={() => router.back()}
          >
            ←
          </button>
          <h2 className="text-2xl font-semibold text-gray-700">Sales Order Details</h2>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            onClick={() => window.print()}
          >
            🖨 Print
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>

      {/* NOTA */}
      <div id="print-area" className="bg-white p-6 rounded shadow">
        <h3 className="text-xl font-bold mb-2">Nota {soNumber}</h3>
        <hr className="mb-4" />

        {/* FORM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <FormRow label="Nomor SO">
              <input
                value={soNumber}
                readOnly
                className="w-full border rounded px-2 py-1 bg-gray-100"
              />
            </FormRow>
            <FormRow label="Tanggal">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </FormRow>
            <FormRow label="Nama Supplier">
              <select
                value={selectedSupplierId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  console.log("SUPPLIER SELECTED:", val);
                  setSelectedSupplierId(val || null);
                }}
                className="w-full border rounded px-2 py-1"
              >
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Nomor Ref Supplier">
              <input
                value={form.ref_customer}
                onChange={(e) => setForm({ ...form, ref_customer: e.target.value })}
                className="w-full border rounded px-2 py-1"
              />
            </FormRow>
            <FormRow label="Jenis Pembelian">
              <select
                value={purchaseType}
                onChange={(e) => setPurchaseType(e.target.value as "Franco" | "Locco")}
                className="w-full border rounded px-2 py-1"
              >
                <option value="Franco">Franco</option>
                <option value="Locco">Locco</option>
              </select>
            </FormRow>

            {/* 🔥 DEPOSIT DROPDOWN - AKTIF */}
            <FormRow label="Deposit">
              <select
                value={selectedDepositId ?? ""}
                onChange={(e) => setSelectedDepositId(e.target.value || null)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="">-- Tanpa Deposit --</option>
                {deposits.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.deposit_code}
                    {" | Sisa "}{d.do_remaining} DO
                    {" | "}{rupiah(d.price_lock_per_m3)}/m³
                  </option>
                ))}
              </select>
            </FormRow>
          </div>

          <div className="space-y-4">
            <FormRow label="Kepada">
              <input
                value={form.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                className="w-full border rounded px-2 py-1"
              />
            </FormRow>
            <FormRow label="Nomor Telp">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border rounded px-2 py-1"
              />
            </FormRow>
            <FormRow label="Alamat">
              <textarea
                rows={3}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full border rounded px-2 py-1"
              />
            </FormRow>
            <FormRow label="Catatan">
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border rounded px-2 py-1"
                placeholder="Catatan tambahan (opsional)"
              />
            </FormRow>
          </div>
        </div>

        {/* DETAIL BARANG */}
        <h4 className="text-lg font-semibold mb-2">Detail Barang</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <colgroup>
              <col style={{ width: "4%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "7%" }} />
            </colgroup>
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 text-center">No</th>
                <th className="border p-2 text-left">Produk</th>
                <th className="border p-2 text-right">Harga / m³</th>
                <th className="border p-2 text-center">Isi / Palet</th>
                <th className="border p-2 text-center">Palet</th>
                <th className="border p-2 text-center">PCS</th>
                <th className="border p-2 text-right">Harga Satuan</th>
                <th className="border p-2 text-right">Jumlah</th>
                <th className="border p-2 text-center">Hapus</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="even:bg-gray-50">
                  <td className="border p-2 text-center text-gray-500">{i + 1}</td>

                  {/* PRODUK */}
                  <td className="border p-2">
                    <select
                      value={item.product_id}
                      onChange={(e) => handleSelectProduct(i, e.target.value)}
                      className="w-full border rounded px-1 py-0.5 text-sm"
                    >
                      <option value="">-- Pilih Produk --</option>
                      {products.map((p, j) => (
                        <option key={p.id ?? j} value={p.id}>
                          {p.name}{p.kubik_m3 > 0 ? ` - ${p.kubik_m3} m³` : ""}
                        </option>
                      ))}
                    </select>
                  </td>

                  {item.is_non_m3 ? (
                    /* ===== NON-M3: Kuli Bongkar / Ongkos Kirim ===== */
                    <>
                      <td className="border p-2" colSpan={4}>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-xs whitespace-nowrap">Total Harga:</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={item.total || ""}
                            onChange={(e) => updateItem(i, "total", Number(e.target.value))}
                            className="flex-1 border rounded px-1 py-0.5 text-sm text-right"
                          />
                        </div>
                      </td>
                      <td className="border p-2 text-center text-gray-300 text-xs">—</td>
                      <td className="border p-2 text-right font-medium">{rupiah(item.total)}</td>
                    </>
                  ) : (
                    /* ===== NORMAL: formula m3 ===== */
                    <>
                      <td className="border p-2">
                        <input
                          type="number"
                          value={item.price_m3}
                          onChange={(e) => updateItem(i, "price_m3", e.target.value)}
                          className="w-full border rounded px-1 py-0.5 text-sm text-right"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          value={item.pallet_size}
                          readOnly
                          className="w-full border rounded px-1 py-0.5 bg-gray-100 text-center text-sm"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          value={item.qty_pallet}
                          onChange={(e) => updateItem(i, "qty_pallet", e.target.value)}
                          className="w-full border rounded px-1 py-0.5 text-center text-sm"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          value={item.qty_pcs}
                          readOnly
                          className="w-full border rounded px-1 py-0.5 bg-gray-100 text-center text-sm"
                        />
                      </td>
                      <td className="border p-2 text-right">{rupiah(item.unit_price)}</td>
                      <td className="border p-2 text-right font-medium">{rupiah(item.total)}</td>
                    </>
                  )}

                  <td className="border p-2 text-center">
                    <button
                      onClick={() =>
                        items.length > 1
                          ? setItems(items.filter((_, idx) => idx !== i))
                          : null
                      }
                      disabled={items.length === 1}
                      className="text-red-400 hover:text-red-600 disabled:opacity-30"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          className="mt-3 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          onClick={() => setItems([...items, emptyItem()])}
        >
          + Tambah Baris
        </button>

        <h3 className="text-right mt-4 text-xl font-bold">
          TOTAL : {rupiah(grandTotal)}
        </h3>
      </div>
    </div>
  );
}
