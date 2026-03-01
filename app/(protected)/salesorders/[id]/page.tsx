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
  const [purchaseType, setPurchaseType] = useState<"Franco" | "Locco">("Franco");
  const [notes, setNotes] = useState("");

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
  const [items, setItems] = useState<SalesOrderItem[]>([]);

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

        const formattedItems: SalesOrderItem[] = (data.sales_order_items ?? []).map(
          (i: any) => {
            const kubik = i.products?.kubik_m3 ?? 0;
            const isNonM3 = !kubik || kubik === 0;
            return {
              id: i.id,
              product_id: i.product_id,
              is_non_m3: isNonM3,
              m3: i.total_m3 ?? 0,
              pallet_size: i.products?.isi_per_palet ?? 0,
              qty_pallet: i.pallet_qty ?? 0,
              qty_pcs: i.total_pcs ?? 0,
              price_m3: i.price_per_m3 ?? 0,
              unit_price:
                !isNonM3 && i.total_pcs > 0 ? i.total_price / i.total_pcs : 0,
              total: i.total_price ?? 0,
            };
          }
        );

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
     FETCH SUPPLIERS
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
     HANDLE SELECT DEPOSIT
     → auto-fill price_m3 ke semua item yg belum diisi
  ====================== */
  const handleSelectDeposit = (deposit: Deposit | null) => {
    if (!deposit) return;

    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        price_m3:
          item.price_m3 && item.price_m3 > 0
            ? item.price_m3
            : deposit.price_lock_per_m3,
      }))
    );
  };

  useEffect(() => {
    const dep = deposits.find((d) => d.id === selectedDepositId) ?? null;
    handleSelectDeposit(dep);
  }, [selectedDepositId, deposits]);

  /* ======================
     SELECT PRODUK (edit mode)
  ====================== */
  const handleSelectProduct = (idx: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;

    const isNonM3 = !p.kubik_m3 || p.kubik_m3 === 0;
    const depositPrice =
      deposits.find((d) => d.id === selectedDepositId)?.price_lock_per_m3 ?? 0;

    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        product_id: p.id,
        is_non_m3: isNonM3,
        m3: isNonM3 ? 0 : p.kubik_m3,
        pallet_size: isNonM3 ? 0 : p.isi_per_palet,
        qty_pallet: isNonM3 ? 0 : 1,
        qty_pcs: isNonM3 ? 0 : p.isi_per_palet,
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
      copy[idx].m3 = 0;
      copy[idx].qty_pcs = 0;
      copy[idx].qty_pallet = 0;
      copy[idx].unit_price = 0;
      copy[idx].price_m3 = 0;
    } else {
      const qtyPalet = Number(copy[idx].qty_pallet) || 0;
      const isiPerPalet = Number(copy[idx].pallet_size) || 0;
      const priceM3 = Number(copy[idx].price_m3) || 0;

      const totalM3 = 1.8 * qtyPalet;
      copy[idx].m3 = totalM3;

      const qtyPcs = qtyPalet * isiPerPalet;
      copy[idx].qty_pcs = qtyPcs;

      copy[idx].unit_price = qtyPcs > 0 ? (priceM3 * totalM3) / qtyPcs : 0;
      copy[idx].total = priceM3 * totalM3;
    }

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
    if (!items.filter((i) => i.product_id).length) {
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
          .filter((i) => i.product_id)
          .map((i) => ({
            product_id: i.product_id,
            // 🔥 FIX: pallet_qty CHECK > 0
            pallet_qty: i.is_non_m3 ? 1 : Number(i.qty_pallet),
            total_pcs: i.is_non_m3 ? 0 : Number(i.qty_pcs),
            price_per_m3: i.is_non_m3 ? 0 : Number(i.price_m3),
            total_price: Number(i.total),
            total_m3: i.is_non_m3 ? 0 : Number(i.m3),
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
    setItems(items.filter((_, i) => i !== idx));
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!originalData) return <div className="p-8">Data tidak ditemukan</div>;

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
              <input value={soNumber} readOnly className="w-full border rounded px-2 py-1 bg-gray-100" />
            </FormRow>
            <FormRow label="Tanggal">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!isEditMode} className="w-full border rounded px-2 py-1 disabled:bg-gray-100" />
            </FormRow>
            <FormRow label="Nama Supplier">
              <select value={selectedCustomerId ?? ""} onChange={(e) => setSelectedCustomerId(e.target.value || null)} disabled={!isEditMode} className="w-full border rounded px-2 py-1 disabled:bg-gray-100">
                <option value="">-- Pilih Supplier --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Nomor Ref Supplier">
              <input value={form.ref_customer} onChange={(e) => setForm({ ...form, ref_customer: e.target.value })} disabled={!isEditMode} className="w-full border rounded px-2 py-1 disabled:bg-gray-100" />
            </FormRow>
            <FormRow label="Jenis Pembelian">
              <select value={purchaseType} onChange={(e) => setPurchaseType(e.target.value as "Franco" | "Locco")} disabled={!isEditMode} className="w-full border rounded px-2 py-1 disabled:bg-gray-100">
                <option value="Franco">Franco</option>
                <option value="Locco">Locco</option>
              </select>
            </FormRow>

            {/* 🔥 DEPOSIT DROPDOWN - AKTIF */}
            <FormRow label="Deposit">
              <select
                value={selectedDepositId ?? ""}
                onChange={(e) => setSelectedDepositId(e.target.value || null)}
                disabled={!isEditMode}
                className="w-full border rounded px-2 py-1 disabled:bg-gray-100"
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
              <input value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} disabled={!isEditMode} className="w-full border rounded px-2 py-1 disabled:bg-gray-100" />
            </FormRow>
            <FormRow label="Nomor Telp">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!isEditMode} className="w-full border rounded px-2 py-1 disabled:bg-gray-100" />
            </FormRow>
            <FormRow label="Alamat">
              <textarea rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} disabled={!isEditMode} className="w-full border rounded px-2 py-1 disabled:bg-gray-100" />
            </FormRow>
            <FormRow label="Catatan">
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!isEditMode} placeholder="Catatan tambahan (opsional)" className="w-full border rounded px-2 py-1 disabled:bg-gray-100" />
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
              {isEditMode && <col style={{ width: "7%" }} />}
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
                {isEditMode && <th className="border p-2 text-center">Hapus</th>}
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
                      disabled={!isEditMode}
                      className="w-full border rounded px-1 py-0.5 text-sm disabled:bg-gray-100"
                    >
                      <option value="">-- Pilih Produk --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.kubik_m3 > 0 ? ` - ${p.kubik_m3} m³` : ""}
                        </option>
                      ))}
                    </select>
                  </td>

                  {item.is_non_m3 ? (
                    /* ===== NON-M3 ===== */
                    <>
                      <td className="border p-2" colSpan={4}>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-xs whitespace-nowrap">Total Harga:</span>
                          {isEditMode ? (
                            <input
                              type="number"
                              placeholder="0"
                              value={item.total || ""}
                              onChange={(e) => updateItem(i, "total", Number(e.target.value))}
                              className="flex-1 border rounded px-1 py-0.5 text-sm text-right"
                            />
                          ) : (
                            <span className="font-medium">{rupiah(item.total)}</span>
                          )}
                        </div>
                      </td>
                      <td className="border p-2 text-center text-gray-300 text-xs">—</td>
                      <td className="border p-2 text-right font-medium">{rupiah(item.total)}</td>
                    </>
                  ) : (
                    /* ===== NORMAL ===== */
                    <>
                      <td className="border p-2">
                        {isEditMode ? (
                          <input type="number" value={item.price_m3} onChange={(e) => updateItem(i, "price_m3", e.target.value)} className="w-full border rounded px-1 py-0.5 text-sm text-right" />
                        ) : rupiah(item.price_m3)}
                      </td>
                      <td className="border p-2">
                        <input value={item.pallet_size} readOnly className="w-full border rounded px-1 py-0.5 bg-gray-100 text-center text-sm" />
                      </td>
                      <td className="border p-2">
                        {isEditMode ? (
                          <input type="number" value={item.qty_pallet} onChange={(e) => updateItem(i, "qty_pallet", e.target.value)} className="w-full border rounded px-1 py-0.5 text-center text-sm" />
                        ) : item.qty_pallet}
                      </td>
                      <td className="border p-2">
                        <input value={item.qty_pcs} readOnly className="w-full border rounded px-1 py-0.5 bg-gray-100 text-center text-sm" />
                      </td>
                      <td className="border p-2 text-right">{rupiah(item.unit_price)}</td>
                      <td className="border p-2 text-right font-medium">{rupiah(item.total)}</td>
                    </>
                  )}

                  {isEditMode && (
                    <td className="border p-2 text-center">
                      <button
                        onClick={() => handleDeleteItem(i)}
                        className="text-red-400 hover:text-red-600 disabled:opacity-30"
                        disabled={items.length === 1}
                      >
                        🗑
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isEditMode && (
          <button
            className="mt-3 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            onClick={() =>
              setItems([...items, {
                product_id: "",
                is_non_m3: false,
                m3: 0,
                pallet_size: 0,
                qty_pallet: 0,
                qty_pcs: 0,
                price_m3: 0,
                unit_price: 0,
                total: 0,
              }])
            }
          >
            + Tambah Baris
          </button>
        )}

        <h3 className="text-right mt-4 text-xl font-bold">
          TOTAL : {rupiah(grandTotal)}
        </h3>
      </div>
    </div>
  );
}
