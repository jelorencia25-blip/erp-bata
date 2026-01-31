"use client";

import { useEffect, useState } from "react";

type Driver = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  data?: any;
};

export default function TripFormModal({
  open,
  onClose,
  onSave,
  data,
}: Props) {
  const [form, setForm] = useState({
    trip_date: "",
    no_surat_jalan: "",
    driver_name: "",
    driver_id: "",
    plat_mobil: "",
    tujuan: "",
    uang_jalan: "",
    biaya_tambahan: "",
    status_trip: "planned",
    status_pembayaran: "unpaid",
  });

  const [sjList, setSjList] = useState<string[]>([]);
  const [vehicleList, setVehicleList] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    if (data) {
      setForm({
        ...data,
        uang_jalan: data.uang_jalan?.toString() || "",
        biaya_tambahan: data.biaya_tambahan?.toString() || "",
        driver_name: data.driver_name || "",
      });
    }

    fetch("/api/driver-trips")
      .then((r) => r.json())
      .then((d) =>
        setSjList(
          Array.from(
            new Set(
              Array.isArray(d)
                ? d.map((x) => x.no_surat_jalan).filter(Boolean)
                : []
            )
          )
        )
      );

    fetch("/api/vehicles")
      .then((r) => r.json())
      .then((d) =>
        setVehicleList(
          Array.isArray(d) ? d.map((v) => v.plate_number) : []
        )
      );

    fetch("/api/drivers")
      .then((r) => r.json())
      .then((d) => setDrivers(Array.isArray(d) ? d : []));
  }, [data, open]);

  if (!open) return null;

  /* ================= FORMAT ================= */
  const formatRupiah = (v: string) => {
    if (!v) return "Rp 0,00";
    const n = Number(v.replace(/\D/g, ""));
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
    }).format(n);
  };

  /* ================= STYLES ================= */
  const input: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "white",
          padding: 24,
          width: 640,
          borderRadius: 12,
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          {data ? "Edit Trip" : "Add Trip"}
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          {/* Tanggal */}
          <div>
            <label>Tanggal</label>
            <input
              type="date"
              style={input}
              value={form.trip_date}
              onChange={(e) =>
                setForm({ ...form, trip_date: e.target.value })
              }
            />
          </div>

          {/* Surat Jalan */}
          <div>
            <label>No Surat Jalan</label>
            <input
              list="sj-list"
              style={input}
              value={form.no_surat_jalan}
              onChange={(e) =>
                setForm({ ...form, no_surat_jalan: e.target.value })
              }
            />
            <datalist id="sj-list">
              {sjList.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          {/* Driver */}
          <div>
            <label>Driver</label>
            <input
              list="driver-list"
              style={input}
              placeholder="Ketik / pilih driver"
              value={form.driver_name}
              onChange={(e) => {
                const name = e.target.value;
                const found = drivers.find((d) => d.name === name);
                setForm({
                  ...form,
                  driver_name: name,
                  driver_id: found?.id || "",
                });
              }}
            />
            <datalist id="driver-list">
              {drivers.map((d) => (
                <option key={d.id} value={d.name} />
              ))}
            </datalist>
          </div>

          {/* Plat */}
          <div>
            <label>Plat Mobil</label>
            <input
              list="vehicle-list"
              style={input}
              value={form.plat_mobil}
              onChange={(e) =>
                setForm({ ...form, plat_mobil: e.target.value })
              }
            />
            <datalist id="vehicle-list">
              {vehicleList.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          {/* Tujuan */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Tujuan</label>
            <input
              style={input}
              value={form.tujuan}
              onChange={(e) =>
                setForm({ ...form, tujuan: e.target.value })
              }
            />
          </div>

          {/* Uang Jalan */}
          <div>
            <label>Uang Jalan</label>
            <input
              style={input}
              inputMode="numeric"
              value={form.uang_jalan}
              onChange={(e) =>
                setForm({
                  ...form,
                  uang_jalan: e.target.value.replace(/\D/g, ""),
                })
              }
            />
            <small>{formatRupiah(form.uang_jalan)}</small>
          </div>

          {/* Tambahan */}
          <div>
            <label>Biaya Tambahan</label>
            <input
              style={input}
              inputMode="numeric"
              value={form.biaya_tambahan}
              onChange={(e) =>
                setForm({
                  ...form,
                  biaya_tambahan: e.target.value.replace(/\D/g, ""),
                })
              }
            />
            <small>{formatRupiah(form.biaya_tambahan)}</small>
          </div>

          {/* Status */}
          <div>
            <label>Status Trip</label>
            <select
              style={input}
              value={form.status_trip}
              onChange={(e) =>
                setForm({ ...form, status_trip: e.target.value })
              }
            >
              <option value="planned">Planned</option>
              <option value="on_trip">On Trip</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label>Status Pembayaran</label>
            <select
              style={input}
              value={form.status_pembayaran}
              onChange={(e) =>
                setForm({
                  ...form,
                  status_pembayaran: e.target.value,
                })
              }
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </div>

        {/* ACTION */}
        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={() =>
              onSave({
                ...form,
                uang_jalan: Number(form.uang_jalan || 0),
                biaya_tambahan: Number(form.biaya_tambahan || 0),
              })
            }
            style={{
              background: "#2563eb",
              color: "white",
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
