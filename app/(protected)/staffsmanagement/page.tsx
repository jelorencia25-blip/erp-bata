"use client";

import { useEffect, useState } from "react";

type Staff = {
  id: string;
  name: string;
  posisi: string;
  level: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  salary: number | null;
  status: string;
};

export default function StaffsManagementPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    posisi: "",
    level: "",
    phone: "",
    email: "",
    address: "",
    salary: "",
    status: "active",
  });

  const loadStaff = async () => {
    try {
      const res = await fetch("/api/staffsmanagement", { cache: "no-store" });
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid data");
      setStaffList(data);
    } catch (err) {
      console.error(err);
      alert("Gagal load staff");
    }
  };

  useEffect(() => { loadStaff(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.posisi) { alert("Name & Posisi wajib"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/staffsmanagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          salary: form.salary?.trim() ? Number(form.salary) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Gagal menambahkan"); return; }
      setForm({ name: "", posisi: "", level: "", phone: "", email: "", address: "", salary: "", status: "active" });
      loadStaff();
    } catch (err) { console.error(err); alert("Error saat menyimpan"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus staff ini?")) return;
    try {
      const res = await fetch("/api/staffsmanagement", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Gagal hapus"); return; }
      loadStaff();
    } catch (err) { console.error(err); alert("Error saat hapus"); }
  };

  const handleEdit = (staff: Staff) => {
    setEditingId(staff.id);
    setForm({
      name: staff.name,
      posisi: staff.posisi,
      level: staff.level || "",
      phone: staff.phone || "",
      email: staff.email || "",
      address: staff.address || "",
      salary: staff.salary?.toString() || "",
      status: staff.status,
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/staffsmanagement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          ...form,
          salary: form.salary?.trim() ? Number(form.salary) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Gagal update"); return; }
      setEditingId(null);
      setForm({ name: "", posisi: "", level: "", phone: "", email: "", address: "", salary: "", status: "active" });
      loadStaff();
    } catch (err) { console.error(err); alert("Error saat update"); }
    finally { setLoading(false); }
  };

  const formatRupiah = (num: number | null) => {
    if (num === null) return "-";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(num);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Staffs Management</h2>

      {/* FORM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <input className="border rounded px-3 py-2" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/>
        <input className="border rounded px-3 py-2" placeholder="Posisi" value={form.posisi} onChange={e => setForm({ ...form, posisi: e.target.value })}/>
        <select
          className="border rounded px-3 py-2"
          value={form.level}
          onChange={(e) => setForm({ ...form, level: e.target.value })}
        >
          <option value="">-- Pilih Level --</option>
          <option value="Owner">Owner</option>
          <option value="Supervisor">Supervisor</option>
          <option value="Manager">Manager</option>
          <option value="Staf">Staf</option>
        </select>
        <input className="border rounded px-3 py-2" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/>
        <input className="border rounded px-3 py-2" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/>
        <input className="border rounded px-3 py-2" placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}/>
        <div className="flex items-center border rounded px-2 py-2">
          <span className="text-gray-600 mr-2">Rp</span>
          <input
            type="number"
            placeholder="Salary"
            value={form.salary}
            onChange={e => setForm({ ...form, salary: e.target.value })}
            className="flex-1 outline-none"
          />
        </div>
        <select className="border rounded px-3 py-2" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {editingId ? (
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="col-span-1 sm:col-span-2 md:col-span-4 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
          >
            {loading ? "Updating..." : "Update Staff"}
          </button>
        ) : (
          <button
            onClick={handleAdd}
            disabled={loading}
            className="col-span-1 sm:col-span-2 md:col-span-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            {loading ? "Saving..." : "Add Staff"}
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border rounded shadow max-w-full">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">No</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Posisi</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Level</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Phone</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Address</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Salary</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
              {/* <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Actions</th> */}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {staffList.map((s, i) => (
              <tr key={s.id}>
                <td className="px-4 py-2">{i+1}</td>
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2">{s.posisi}</td>
                <td className="px-4 py-2">{s.level ?? "-"}</td>
                <td className="px-4 py-2">{s.phone ?? "-"}</td>
                <td className="px-4 py-2">{s.email ?? "-"}</td>
                <td className="px-4 py-2">{s.address ?? "-"}</td>
                <td className="px-4 py-2 text-right">{formatRupiah(s.salary)}</td>
                <td className="px-4 py-2">{s.status}</td>
                <td className="px-4 py-2 text-center flex justify-center gap-2">
                  <button
                    onClick={() => handleEdit(s)}
                    className="bg-yellow-500 text-white px-4 py-1.5 rounded hover:bg-yellow-600 transition"
                  >
                    Edit
                  </button>
                  {/* <button
                    onClick={() => handleDelete(s.id)}
                    className="bg-red-600 text-white px-4 py-1.5 rounded hover:bg-red-700 transition"
                  >
                    Delete
                  </button> */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
