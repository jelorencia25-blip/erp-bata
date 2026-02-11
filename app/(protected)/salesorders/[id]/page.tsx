"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
type Customer = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  ukuran: string;
  kubik_m3: number;
  isi_per_palet: number;
};

type Deposit = {
  id: string;
  deposit_code: string;
  price_lock_per_m3: number;
  do_remaining: number;
};

type SalesOrderItem = {
  id?: string;
  product_id: string;
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

export default function SalesOrderDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Original data (untuk cancel)
  const [originalData, setOriginalData] = useState<any>(null);

  // Form state
  const [soNumber, setSoNumber] = useState("");
  const [date, setDate] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [purchaseType, setPurchaseType] = useState<'Franco' | 'Locco'>('Franco');
  const [notes, setNotes] = useState('');

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);

  // Master data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Header form
  const [form, setForm] = useState({
    ref_customer: "",
    to: "",
    phone: "",
    address: "",
  });

  // Items
  const [items, setItems] = useState<SalesOrderItem[]>([
    {
      product_id: "",
      m3: 0,
      pallet_size: 0,
      qty_pallet: 0,
      qty_pcs: 0,
      price_m3: 0,
      unit_price: 0,
      total: 0,
    },
  ]);

  /* ======================
     FETCH SALES ORDER DATA
  ====================== */
  useEffect(() => {
    if (!id) return;

    const fetchSO = async () => {
      try {
        const res = await fetch(`/api/salesorders/${id}`);
        const data = await res.json();

        console.log("RAW API RESPONSE:", data);

        // Set form data
        setSoNumber(data.so_number ?? "-");
        setDate(data.order_date ?? "");
        setSelectedCustomerId(data.customer_id);
        setPurchaseType(data.purchase_type ?? "Franco");
        setNotes(data.notes ?? "");
        setSelectedDepositId(data.deposit_id ?? null);

        setForm({
          ref_customer: data.customer_order_ref ?? "",
          to: data.ship_to_name ?? "",
          phone: data.contact_phone ?? "",
          address: data.delivery_address ?? "",
        });

        // Set items
        const formattedItems = (data.sales_order_items ?? []).map((i: any) => ({
          id: i.id,
          product_id: i.product_id,
          m3: i.total_m3 ?? 0,
          pallet_size: i.products?.isi_per_palet ?? 0,
          qty_pallet: i.pallet_qty ?? 0,
          qty_pcs: i.total_pcs ?? 0,
          price_m3: i.price_per_m3 ?? 0,
          unit_price: i.total_pcs > 0 ? i.total_price / i.total_pcs : 0,
          total: i.total_price ?? 0,
        }));

        setItems(formattedItems);

        // Save original for cancel
        setOriginalData({
          soNumber: data.so_number,
          date: data.order_date,
          selectedCustomerId: data.customer_id,
          purchaseType: data.purchase_type,
          notes: data.notes,
          selectedDepositId: data.deposit_id,
          form: {
            ref_customer: data.customer_order_ref ?? "",
            to: data.ship_to_name ?? "",
            phone: data.contact_phone ?? "",
            address: data.delivery_address ?? "",
          },
          items: JSON.parse(JSON.stringify(formattedItems)),
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching SO:", error);
        alert("Gagal memuat data Sales Order");
        setLoading(false);
      }
    };

    fetchSO();
  }, [id]);

  /* ======================
     FETCH SUPPLIERS (dari API customers)
  ====================== */
  useEffect(() => {
    const fetchSuppliers = async () => {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      console.log("RAW SUPPLIER API RESPONSE:", data);
      setCustomers(data);
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
     FETCH DEPOSITS
  ====================== */
  useEffect(() => {
    if (!selectedCustomerId) {
      setDeposits([]);
      setSelectedDepositId(null);
      return;
    }

    const fetchDeposits = async () => {
      const res = await fetch(
        `/api/deposits/active?customer_id=${selectedCustomerId}`
      );
      const data = await res.json();
      setDeposits(data);
    };

    fetchDeposits();
  }, [selectedCustomerId]);

  /* ======================
     HANDLE DEPOSIT SELECT
  ====================== */
  const handleSelectDeposit = (deposit: Deposit | null) => {
    if (!deposit) return;

    setItems(prev =>
      prev.map(item => ({
        ...item,
        price_m3:
          item.price_m3 && item.price_m3 > 0
            ? item.price_m3
            : deposit.price_lock_per_m3,
      }))
    );
  };

  useEffect(() => {
    const dep = deposits.find(d => d.id === selectedDepositId) ?? null;
    handleSelectDeposit(dep);
  }, [selectedDepositId, deposits]);

  /* ======================
     UPDATE ITEM
  ====================== */
  const updateItem = (idx: number, field: string, value: any) => {
    const copy = [...items];
    // @ts-ignore
    copy[idx][field] = value;

    const qtyPalet = Number(copy[idx].qty_pallet) || 0;
    const isiPerPalet = Number(copy[idx].pallet_size) || 0;
    const priceM3 = Number(copy[idx].price_m3) || 0;

    // 🔥 M³ HARUS DINAMIS (1.8 × jumlah palet)
    const m3PerPallet = 1.8;
    const totalM3 = m3PerPallet * qtyPalet;
    copy[idx].m3 = totalM3;

    // 1️⃣ PCS
    const qtyPcs = qtyPalet * isiPerPalet;
    copy[idx].qty_pcs = qtyPcs;

    // 2️⃣ Harga satuan PCS
    const unitPrice = qtyPcs > 0 ? (priceM3 * totalM3) / qtyPcs : 0;
    copy[idx].unit_price = unitPrice;

    // 3️⃣ Total harga
    copy[idx].total = priceM3 * totalM3;

    setItems(copy);
  };

  /* ======================
     GRAND TOTAL
  ====================== */
  const grandTotal = items.reduce((s, i) => s + i.total, 0);

  /* ======================
     CANCEL EDIT
  ====================== */
  const handleCancelEdit = () => {
    if (originalData) {
      setSoNumber(originalData.soNumber);
      setDate(originalData.date);
      setSelectedCustomerId(originalData.selectedCustomerId);
      setPurchaseType(originalData.purchaseType);
      setNotes(originalData.notes);
      setSelectedDepositId(originalData.selectedDepositId);
      setForm(JSON.parse(JSON.stringify(originalData.form)));
      setItems(JSON.parse(JSON.stringify(originalData.items)));
    }
    setIsEditMode(false);
  };

  /* ======================
     SAVE CHANGES
  ====================== */
  const handleSave = async () => {
    if (!selectedCustomerId) {
      alert("Customer wajib dipilih");
      return;
    }

    if (!items.filter(i => i.product_id).length) {
      alert("Minimal satu produk harus diisi");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        order_date: date,
        customer_order_ref: form.ref_customer || "",
        ship_to_name: form.to || null,
        contact_phone: form.phone || null,
        delivery_address: form.address || null,
        purchase_type: purchaseType,
        notes: notes,
        deposit_id: selectedDepositId || null,

        items: items
          .filter(i => i.product_id)
          .map(i => ({
            product_id: i.product_id,
            pallet_qty: Number(i.qty_pallet),
            total_pcs: Number(i.qty_pcs),
            price_per_m3: Number(i.price_m3),
            total_price: Number(i.total),
            total_m3: Number(i.m3),
          })),
      };

      console.log("UPDATE PAYLOAD:", JSON.stringify(payload, null, 2));

      const res = await fetch(`/api/salesorders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Gagal update Sales Order");

      alert("Sales Order berhasil diupdate!");
      
      // Update original data
      setOriginalData({
        soNumber,
        date,
        selectedCustomerId,
        purchaseType,
        notes,
        selectedDepositId,
        form: JSON.parse(JSON.stringify(form)),
        items: JSON.parse(JSON.stringify(items)),
      });

      setIsEditMode(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  /* ======================
     DELETE ITEM
  ====================== */
  const handleDeleteItem = (idx: number) => {
    if (items.length === 1) {
      alert("Minimal harus ada 1 item");
      return;
    }
    const newItems = items.filter((_, i) => i !== idx);
    setItems(newItems);
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!originalData) return <div className="p-8">Data tidak ditemukan</div>;

  return (
    <div className="page-wrapper p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            className="p-2 bg-gray-200 rounded hover:bg-gray-300"
            onClick={() => router.push("/salesorders")}
          >
            ←
          </button>
          <h2 className="text-2xl font-semibold text-gray-700">
            {isEditMode ? "Edit Sales Order" : "Sales Order Details"}
          </h2>
        </div>

        <div className="flex gap-2">
          {!isEditMode ? (
            <>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => setIsEditMode(true)}
              >
                ✏️ Edit
              </button>
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => window.print()}
              >
                🖨 Print
              </button>
            </>
          ) : (
            <>
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                ❌ Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "💾 Save"}
              </button>
            </>
          )}
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
                disabled={!isEditMode}
                className="w-full border rounded px-2 py-1 disabled:bg-gray-100"
              />
            </FormRow>

            <FormRow label="Nama Supplier">
              <select
                value={selectedCustomerId ?? ""}
                onChange={(e) => setSelectedCustomerId(e.target.value || null)}
                disabled={!isEditMode}
                className="w-full border rounded px-2 py-1 disabled:bg-gray-100"
              >
                <option value="">-- Pilih Supplier --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Nomor Ref Supplier">
              <input
                value={form.ref_customer}
                onChange={(e) =>
                  setForm({ ...form, ref_customer: e.target.value })
                }
                disabled={!isEditMode}
                className="w-full border rounded px-2 py-1 disabled:bg-gray-100"
              />
            </FormRow>

            <FormRow label="Jenis Pembelian">
              <select
                value={purchaseType}
                onChange={(e) =>
                  setPurchaseType(e.target.value as 'Franco' | 'Locco')
                }
                disabled={!isEditMode}
                className="w-full border rounded px-2 py-1 disabled:bg-gray-100"
              >
                <option value="Franco">Franco</option>
                <option value="Locco">Locco</option>
              </select>
            </FormRow>

            <FormRow label="Deposit">
              <select
                value={selectedDepositId ?? ""}
                onChange={(e) =>
                  setSelectedDepositId(e.target.value || null)
                }
                disabled={!isEditMode}
                className="w-full border rounded px-2 py-1 disabled:bg-gray-100"
              >
                <option value="">-- Tanpa Deposit --</option>
                {deposits.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.deposit_code}
                    {" | Sisa "}{d.do_remaining} DO
                    {" | "}{rupiah(d.price_lock_per_m3)}
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
                disabled={!isEditMode}
                className="w-full border rounded px-2 py-1 disabled:bg-gray-100"
              />
            </FormRow>

            <FormRow label="Nomor Telp">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={!isEditMode}
                className="w-full border rounded px-2 py-1 disabled:bg-gray-100"
              />
            </FormRow>

            <FormRow label="Alamat">
              <textarea
                rows={3}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                disabled={!isEditMode}
                className="w-full border rounded px-2 py-1 disabled:bg-gray-100"
              />
            </FormRow>

            <FormRow label="Catatan">
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!isEditMode}
                className="w-full border rounded px-2 py-1 disabled:bg-gray-100"
                placeholder="Catatan tambahan (opsional)"
              />
            </FormRow>
          </div>
        </div>

        {/* DETAIL BARANG */}
        <h4 className="text-lg font-semibold mb-2">Detail Barang</h4>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                {["No", "Produk", "Harga / m³", "Isi / Palet", "Palet", "PCS", "Harga Satuan", "Jumlah"].map((h) => (
                  <th key={h} className="border p-2 text-left">{h}</th>
                ))}
                {isEditMode && <th className="border p-2">Action</th>}
              </tr>
            </thead>

            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="even:bg-gray-50">
                  <td className="border p-2">{i + 1}</td>

                  <td className="border p-2">
                    <select
                      value={item.product_id}
                      onChange={(e) => {
                        const p = products.find(x => x.id === e.target.value);
                        if (!p) return;

                        setItems(prev => {
                          const copy = [...prev];
                          copy[i] = {
                            ...copy[i],
                            product_id: p.id,
                            m3: p.kubik_m3,
                            pallet_size: p.isi_per_palet,
                            qty_pallet: 1,
                            qty_pcs: p.isi_per_palet,
                            price_m3: copy[i]?.price_m3 || 0,
                            unit_price: 0,
                            total: 0,
                          };
                          return copy;
                        });
                      }}
                      disabled={!isEditMode}
                      className="w-full border rounded px-1 py-0.5 disabled:bg-gray-100"
                    >
                      <option value="">-- Pilih Produk --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - {p.kubik_m3} m³
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="border p-2">
                    {isEditMode ? (
                      <input
                        type="number"
                        value={item.price_m3}
                        onChange={(e) => updateItem(i, "price_m3", e.target.value)}
                        className="w-full border rounded px-1 py-0.5"
                      />
                    ) : (
                      rupiah(item.price_m3)
                    )}
                  </td>

                  <td className="border p-2">
                    <input
                      value={item.pallet_size}
                      readOnly
                      className="w-full border rounded px-1 py-0.5 bg-gray-100"
                    />
                  </td>

                  <td className="border p-2">
                    {isEditMode ? (
                      <input
                        type="number"
                        value={item.qty_pallet}
                        onChange={(e) => updateItem(i, "qty_pallet", e.target.value)}
                        className="w-full border rounded px-1 py-0.5"
                      />
                    ) : (
                      item.qty_pallet
                    )}
                  </td>

                  <td className="border p-2">
                    <input
                      value={item.qty_pcs}
                      readOnly
                      className="w-full border rounded px-1 py-0.5 bg-gray-100"
                    />
                  </td>

                  <td className="border p-2">{rupiah(item.unit_price)}</td>
                  <td className="border p-2">{rupiah(item.total)}</td>

                  {isEditMode && (
                    <td className="border p-2 text-center">
                      <button
                        onClick={() => handleDeleteItem(i)}
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ADD ITEM BUTTON */}
        {isEditMode && (
          <button
            className="mt-3 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={() =>
              setItems([
                ...items,
                {
                  product_id: "",
                  m3: 0,
                  pallet_size: 0,
                  qty_pallet: 0,
                  qty_pcs: 0,
                  price_m3: 0,
                  unit_price: 0,
                  total: 0,
                },
              ])
            }
          >
            + Tambah Baris
          </button>
        )}

        {/* TOTAL */}
        <h3 className="text-right mt-4 text-xl font-bold">
          TOTAL : {rupiah(grandTotal)}
        </h3>
      </div>
    </div>
  );
}
