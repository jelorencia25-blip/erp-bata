"use client";

import { useEffect, useState } from "react";

type Suppliers = {
  id: string;
  name: string;
  nametambahan: string | null;
  phone: string | null;
  address: string | null;
  credit_limit: number;
  status: string;
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Suppliers[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    nametambahan: "",
    phone: "",
    address: "",
    credit_limit: 0,
    status: "active",
  });

  // Load suppliers
  const loadSuppliers = async () => {
    const res = await fetch("/api/suppliers");
    const data = await res.json();
    if (!Array.isArray(data)) {
      alert("Gagal load suppliers");
      return;
    }
    setSuppliers(data);
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  // Tambah customer
  const handleAdd = async () => {
    if (!form.name.trim()) {
      alert("Nama Supplier wajib diisi!");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error);
      return;
    }

    setForm({
      name: "",
      nametambahan: "",
      phone: "",
      address: "",
      credit_limit: 0,
      status: "active",
    });

    loadSuppliers();
  };

  // Hapus supplier
  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus supplier ini?")) return;

    const res = await fetch(`/api/suppliers?id=${id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }

    loadSuppliers();
  };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Suppliers</h1>

      {/* FORM TAMBAH CUSTOMER */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <input
          placeholder="Nama Supplier"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={{ padding: 8, borderRadius: 6, flex: 1, minWidth: 150 }}
        />
        <input
          placeholder="Nama Tambahan"
          value={form.nametambahan}
          onChange={(e) =>
            setForm({ ...form, nametambahan: e.target.value })
          }
          style={{ padding: 8, borderRadius: 6, flex: 1, minWidth: 150 }}
        />
        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          style={{ padding: 8, borderRadius: 6, flex: 1, minWidth: 120 }}
        />
        <input
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          style={{ padding: 8, borderRadius: 6, flex: 1, minWidth: 150 }}
        />
        <input
          type="number"
          placeholder="Credit Limit"
          value={form.credit_limit}
          onChange={(e) =>
            setForm({ ...form, credit_limit: Number(e.target.value) })
          }
          style={{ padding: 8, borderRadius: 6, width: 120 }}
        />
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          style={{ padding: 8, borderRadius: 6, width: 120 }}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          onClick={handleAdd}
          disabled={loading}
          style={{
            padding: "8px 16px",
            backgroundColor: "#4ade80",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            color: "#fff",
          }}
        >
          {loading ? "Saving..." : "Add"}
        </button>
      </div>

      {/* TABLE LIST CUSTOMER */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        }}
      >
        <thead style={{ backgroundColor: "#f3f4f6" }}>
          <tr>
            <th style={{ padding: 12 }}>No</th>
            <th style={{ padding: 12 }}>Name</th>
            <th style={{ padding: 12 }}>Nama Tambahan</th>
            <th style={{ padding: 12 }}>Phone</th>
            <th style={{ padding: 12 }}>Address</th>
            <th style={{ padding: 12 }}>Credit Limit</th>
            <th style={{ padding: 12 }}>Status</th>
            {/* <th style={{ padding: 12 }}>Action</th> */}
          </tr>
        </thead>
        <tbody>
          {suppliers.map((c, i) => (
            <tr
              key={c.id}
              style={{
                textAlign: "center",
                borderBottom: "1px solid #ddd",
                backgroundColor: i % 2 === 0 ? "#fff" : "#f9fafb",
              }}
            >
              <td style={{ padding: 8 }}>{i + 1}</td>
              <td>{c.name}</td>
              <td>{c.nametambahan ?? "-"}</td>
              <td>{c.phone ?? "-"}</td>
              <td>{c.address ?? "-"}</td>
              <td>{c.credit_limit}</td>
              <td>{c.status}</td>
              {/* <td>
                <button
                  onClick={() => handleDelete(c.id)}
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "#f87171",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    color: "#fff",
                  }}
                >
                  Delete
                </button>
              </td> */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
