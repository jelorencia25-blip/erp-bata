"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SalesOrderForm from "@/components/sales-order/SalesOrderForm";


/* ======================
   Generate Nomor SO
====================== */


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
      {/* Label */}
      <div className="w-40 font-medium text-gray-700">{label}:</div>

      {/* Input */}
      <div className="flex-1">{children}</div>
    </div>
  );
}


export default function AddSalesOrderPage() {
  const router = useRouter();

  const [soNumber, setSoNumber] = useState("");
  const [date, setDate] = useState("");
  const [selectedSupplierId, setSelectedSupplierId  ] = useState<string | null>(null);
  const [purchaseType, setPurchaseType] = useState<'Franco' | 'Locco'>('Franco');
  const [notes, setNotes] = useState('');

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
  const [items, setItems] = useState([
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


  const handleSelectDeposit = (deposit: Deposit | null) => {
  if (!deposit) return;

  setItems(prev =>
    prev.map(item => ({
      ...item,
      // 🔥 JANGAN overwrite kalau user sudah isi manual
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
     FETCH CUSTOMERS
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

 // FETCH DEPOSITS

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

 // fetch harga deposit
useEffect(() => {
  const dep = deposits.find(d => d.id === selectedDepositId) ?? null;
  handleSelectDeposit(dep);
}, [selectedDepositId]);

  /* ======================
     UPDATE ITEM (PCS AUTO)
  ====================== */
  const updateItem = (idx: number, field: string, value: any) => {
  const copy = [...items];
  // @ts-ignore
  copy[idx][field] = value;

  const qtyPalet = Number(copy[idx].qty_pallet) || 0;
  const isiPerPalet = Number(copy[idx].pallet_size) || 0;
  const m3 = Number(copy[idx].m3) || 0;
  const priceM3 = Number(copy[idx].price_m3) || 0;

  


  // 1️⃣ PCS
  const qtyPcs = qtyPalet * isiPerPalet;
  copy[idx].qty_pcs = qtyPcs;

// 2️⃣ Harga satuan PCS (KONSTAN)
const unitPrice = priceM3 * m3/ qtyPcs;
copy[idx].unit_price = unitPrice;

// 3️⃣ Total harga (YANG BERUBAH)
copy[idx].total =  qtyPcs * unitPrice;


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
  console.log("UUID CHECK:", /^[0-9a-f-]{36}$/i.test(selectedSupplierId));

  // 🔥 FIX: 1 SO = 1 DO (bukan sum pallet)
  const selectedDeposit = deposits.find(d => d.id === selectedDepositId);
  const depositDoUsed = selectedDeposit ? 1 : 0;  // ✅ SELALU 1 kalau pakai deposit
  const depositAmountUsed = selectedDeposit ? grandTotal : 0;

  const payload = {
    customer_id: selectedSupplierId,
    ship_to_name: form.to || null,
    contact_phone: form.phone || null,
    delivery_address: form.address || null,
    customer_order_ref: form.ref_customer || "",
    purchase_type: purchaseType,
    notes: notes,

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

    // 🔥 DEPOSIT DATA
    deposit_id: selectedDepositId || null,
    deposit_do_used: depositDoUsed,  // ✅ Selalu 1
    deposit_amount_used: depositAmountUsed,
  };

  console.log("FINAL PAYLOAD:", JSON.stringify(payload, null, 2));
  console.log("DEPOSIT DATA:", {
    deposit_id: payload.deposit_id,
    do_used: payload.deposit_do_used,
    amount_used: payload.deposit_amount_used,
  });

  if (!payload.items.length) {
    alert("Minimal satu produk harus diisi");
    return;
  }

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
            className="w-full border rounded px-2 py-1"
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
            onChange={(e) =>
              setForm({ ...form, ref_customer: e.target.value })
            }
            className="w-full border rounded px-2 py-1"
          />
        </FormRow>

<FormRow label="Jenis Pembelian">
  <select
    value={purchaseType}
    onChange={(e) =>
      setPurchaseType(e.target.value as 'Franco' | 'Locco')
    }
    className="w-full border rounded px-2 py-1"
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
    className="w-full border rounded px-2 py-1"
  >
    <option value="">-- Tanpa Deposit --</option>

    {deposits.map((d) => (
    <option key={d.id} value={d.id}>
  {d.deposit_code}
  {" | Sisa "}{d.do_remaining} DO
  {" | Rp "}{rupiah(d.price_lock_per_m3)}
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
      <table className="w-full table-auto border-collapse border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            {["No","Produk","Harga / m3","Isi / Palet","Palet","PCS","Harga Satuan","Jumlah"].map((h) => (
              <th key={h} className="border p-2 text-left">{h}</th>
            ))}
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
      product_id: p.id,          // UUID ONLY
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


          className="w-full border rounded px-1 py-0.5"
        >
          <option value="">-- Pilih Produk --</option>
          {products.map((p, j) => (
            <option key={p.id ?? j} value={p.id}>
              {p.name} - {p.kubik_m3} m³
            </option>
          ))}
        </select>
      </td>
      <td className="border p-2">
        <input
          type="number"
          value={item.price_m3}
          onChange={(e) => updateItem(i, "price_m3", e.target.value)}
          className="w-full border rounded px-1 py-0.5"
        />
      </td>
      <td className="border p-2">
        <input
          value={item.pallet_size}
          readOnly
          className="w-full border rounded px-1 py-0.5 bg-gray-100"
        />
      </td>
      <td className="border p-2">
        <input
          type="number"
          value={item.qty_pallet}
          onChange={(e) => updateItem(i, "qty_pallet", e.target.value)}
          className="w-full border rounded px-1 py-0.5"
        />
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
    </tr>
  ))}
</tbody>

        
      </table>
    </div>

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

    <h3 className="text-right mt-4 text-xl font-bold">
      TOTAL : {rupiah(grandTotal)}
    </h3>
  </div>
</div>

  );
}
