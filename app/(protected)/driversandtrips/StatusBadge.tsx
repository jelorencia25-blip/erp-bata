export default function StatusBadge({ value }: { value: string }) {
  const colors: any = {
    planned: "#94a3b8",
    on_trip: "#2563eb",
    completed: "#16a34a",
    cancelled: "#dc2626",
    unpaid: "#dc2626",
    partial: "#f59e0b",
    paid: "#16a34a",
  };

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        background: colors[value],
        color: "white",
        textTransform: "capitalize",
      }}
    >
      {value}
    </span>
  );
}
