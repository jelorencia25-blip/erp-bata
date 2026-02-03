// components/sidebarAccess.ts

export type UserRole =
  | "pemilik"
  | "owner"
  | "staff"
  | "operator"
  | "admin_ops"
  | "admin_finance";

export const SIDEBAR_ACCESS: Record<UserRole, string[]> = {
  owner: [
    "Dashboard",
    "Sales Orders",
    "Deliveries",
    "Invoices",
    "Returns",
    "Payments",
    "Deposits",
    "Drivers & Trips",
    "Vehicles",
    "Products",
    "Suppliers",
    "Staffs Management",
    "Finance",
    "Reports",
    "Audits",
  ],

  pemilik: [
    "Dashboard",
    "Sales Orders",
    "Deliveries",
    "Invoices",
    "Returns",
    "Payments",
    "Deposits",
    "Drivers & Trips",
    "Vehicles",
    "Products",
    "Suppliers",
    "Staffs Management",
  ],

  staff: [
    "Dashboard",
    "Sales Orders",
    "Invoices",
    "Returns",
    "Payments",
    "Deposits",
    "Drivers & Trips",
    "Vehicles",
    "Products",
    "Suppliers",
  ],

  operator: [
    "Deliveries",
    "Returns",
    "Drivers & Trips",
    "Vehicles",
    "Products",
    "Suppliers",
  ],

  // mapping role lama
  admin_ops: [
    "Dashboard",
    "Sales Orders",
    "Deliveries",
    "Returns",
    "Drivers & Trips",
    "Vehicles",
  ],

  admin_finance: [
    "Dashboard",
    "Invoices",
    "Payments",
    "Finance",
    "Reports",
  ],
};
