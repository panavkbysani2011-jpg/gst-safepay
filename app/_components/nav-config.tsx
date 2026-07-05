import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

export type IconName =
  | "overview"
  | "payments"
  | "ims"
  | "rcm"
  | "vendors"
  | "compliance"
  | "report"
  | "import"
  | "settings";

// Primary cockpit navigation (order = the user's mental flow).
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/payments", label: "Payments", icon: "payments" },
  { href: "/ims", label: "GST IMS", icon: "ims" },
  { href: "/rcm", label: "Reverse charge", icon: "rcm" },
  { href: "/vendors", label: "Vendors", icon: "vendors" },
  { href: "/compliance", label: "Compliance", icon: "compliance" },
  { href: "/report", label: "Action report", icon: "report" },
];

export const IMPORT_ITEM: NavItem = {
  href: "/import",
  label: "Import data",
  icon: "import",
};

// Topbar title + one-line context, keyed by the first path segment.
export const ROUTE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Overview", subtitle: "Your money-safety cockpit" },
  "/payments": {
    title: "Payments",
    subtitle: "MSME 45-day payment safety · who to pay first",
  },
  "/ims": {
    title: "GST IMS",
    subtitle: "Accept or reject invoices before the GSTR-2B cutoff",
  },
  "/rcm": {
    title: "Reverse charge",
    subtitle: "Self-invoice & cash-GST watchdog (Rule 47A)",
  },
  "/vendors": { title: "Vendors", subtitle: "GSTIN validity & re-verification" },
  "/compliance": {
    title: "Compliance",
    subtitle: "Filing deadlines & evidence vault",
  },
  "/report": {
    title: "Action report",
    subtitle: "A printable summary for you or your CA",
  },
  "/import": {
    title: "Import data",
    subtitle: "Upload your vendors, bills & filings",
  },
  "/settings": { title: "Settings", subtitle: "Account & preferences" },
};

export function routeMetaFor(pathname: string): { title: string; subtitle: string } {
  const seg = "/" + (pathname.split("/")[1] ?? "");
  return ROUTE_META[seg] ?? { title: "GST SafePay", subtitle: "" };
}

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

const PATHS: Record<IconName, ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  payments: <path d="M3 7h18M3 12h18M3 17h12" />,
  ims: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
      <path d="M4 10h16" />
    </>
  ),
  rcm: <path d="M12 3v18M5 10l7-7 7 7" />,
  vendors: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  compliance: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4" />
    </>
  ),
  report: (
    <>
      <path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  import: (
    <>
      <path d="M12 16V4m0 0L8 8m4-4 4 4" />
      <path d="M4 20h16" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M2 12h3m14 0h3M4.2 19.8l2.1-2.1m11.4-11.4 2.1-2.1" />
    </>
  ),
};

export function NavIcon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[18px] shrink-0"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
