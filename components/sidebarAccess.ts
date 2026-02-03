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
    "Raw Orders",
    "Sales Orders",
    "Deliveries",
    "Invoices",
    "Returns",
    "Payments",
    "Deposits",
    "Track Payments",
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
    "Raw Orders",
    "Sales Orders",
    "Deliveries",
    "Invoices",
    "Returns",
    "Payments",
    "Deposits",
    "Track Payments",
    "Drivers & Trips",
    "Vehicles",
    "Products",
    "Suppliers",
    "Staffs Management",
  ],

  staff: [
    "Dashboard",
    "Raw Orders",
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
    "Dashboard",
    "Raw Orders",
    "Deliveries",
    "Returns",
    "Track Payments",
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
