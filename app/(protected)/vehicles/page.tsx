'use client';

import { useEffect, useState, useRef } from "react";

type VehicleStatus = "active" | "inactive" | "maintenance";

type Vehicle = {
  id: string;
  plate_number: string;
  type: string | null;
  max_pallet: number | null;
  status: VehicleStatus;
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [id: string]: boolean }>({});

  const [form, setForm] = useState({
    plate_number: "",
    type: "",
    max_pallet: "",
    status: "active" as VehicleStatus,
  });

  // Debounce timer ref
  const updateTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // ===============================
  // Load all vehicles
  // ===============================
  const loadVehicles = async () => {
    try {
      const res = await fetch("/api/vehicles");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid response");
      setVehicles(data);
    } catch (err: any) {
      alert("❌ Gagal load vehicles: " + err.message);
      console.error(err);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  // ===============================
  // Add Vehicle
  // ===============================
  const handleAdd = async () => {
    if (!form.plate_number.trim()) {
      alert("Plate Number wajib");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plate_number: form.plate_number.trim(),
          type: form.type.trim() || null,
          max_pallet: form.max_pallet ? Number(form.max_pallet) : null,
          status: form.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add vehicle");

      await loadVehicles();
      setForm({ plate_number: "", type: "", max_pallet: "", status: "active" });
      alert("✅ Vehicle added!");
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // Delete Vehicle
  // ===============================
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    
    setActionLoading((prev) => ({ ...prev, [id]: true }));

    try {
      const res = await fetch(`/api/vehicles/${id}`, { 
        method: "DELETE" 
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete vehicle");
      }

      // Remove from UI
      setVehicles((prev) => prev.filter((v) => v.id !== id));
      alert("✅ Vehicle deleted!");
      
    } catch (err: any) {
      alert(`❌ ${err.message}`);
      console.error(err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ===============================
  // Inline Update Vehicle (Debounced)
  // ===============================
  const handleUpdate = (
    id: string,
    field: keyof Omit<Vehicle, "id">,
    value: any
  ) => {
    // Update UI immediately
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );

    // Clear existing timeout for this vehicle+field
    const timeoutKey = `${id}-${field}`;
    if (updateTimeoutRef.current[timeoutKey]) {
      clearTimeout(updateTimeoutRef.current[timeoutKey]);
    }

    // Set new timeout to actually save
    updateTimeoutRef.current[timeoutKey] = setTimeout(async () => {
      setActionLoading((prev) => ({ ...prev, [id]: true }));

      try {
        const res = await fetch(`/api/vehicles/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update vehicle");
        }

        console.log(`✅ Updated ${field} for vehicle ${id}`);
        
      } catch (err: any) {
        alert(`❌ ${err.message}`);
        // Reload to get correct data
        loadVehicles();
      } finally {
        setActionLoading((prev) => ({ ...prev, [id]: false }));
      }
    }, 800); // Wait 800ms after user stops typing
  };

  const statusColors: Record<VehicleStatus, string> = {
    active: "bg-green-200 text-green-900",
    inactive: "bg-gray-200 text-gray-800",
    maintenance: "bg-yellow-200 text-yellow-900",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Vehicles</h1>

      {/* ADD FORM */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <input
          className="border rounded px-3 py-2 flex-1 min-w-37.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Plate Number"
          value={form.plate_number}
          onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
        />
        <input
          className="border rounded px-3 py-2 flex-1 min-w-37.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Type (Truck / Pickup)"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        />
        <input
          type="number"
          className="border rounded px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Max Pallet"
          value={form.max_pallet}
          onChange={(e) => setForm({ ...form, max_pallet: e.target.value })}
        />
        <select
          className="border rounded px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value as VehicleStatus })
          }
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={handleAdd}
          disabled={loading}
        >
          {loading ? "Saving..." : "Add Vehicle"}
        </button>
      </div>

      {/* VEHICLES TABLE */}
      <div className="overflow-x-auto border rounded">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">No</th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Plate Number</th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Type</th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Max Pallet</th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vehicles.map((v, i) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{i + 1}</td>

                <td className="px-4 py-2">
                  <input
                    className="border rounded px-2 py-1 w-full text-sm"
                    value={v.plate_number}
                    disabled={actionLoading[v.id]}
                    onChange={(e) => handleUpdate(v.id, "plate_number", e.target.value)}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    className="border rounded px-2 py-1 w-full text-sm"
                    value={v.type ?? ""}
                    disabled={actionLoading[v.id]}
                    onChange={(e) => handleUpdate(v.id, "type", e.target.value || null)}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    className="border rounded px-2 py-1 w-full text-sm"
                    value={v.max_pallet ?? ""}
                    disabled={actionLoading[v.id]}
                    onChange={(e) =>
                      handleUpdate(
                        v.id,
                        "max_pallet",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                </td>

                <td className="px-4 py-2">
                  <select
                    value={v.status}
                    disabled={actionLoading[v.id]}
                    onChange={(e) =>
                      handleUpdate(v.id, "status", e.target.value as VehicleStatus)
                    }
                    className={`border rounded px-3 py-1 text-sm font-semibold ${statusColors[v.status]}`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </td>

                <td className="px-4 py-2">
                  <button
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                    onClick={() => handleDelete(v.id)}
                    disabled={actionLoading[v.id]}
                  >
                    {actionLoading[v.id] ? "..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}

            {vehicles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No vehicles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}