/**
 * SYNTHETIC DEMO DATA — not a real business. Exercises the RCM watchdog's
 * statuses: self-invoice not-applicable / safe / due-soon / overdue / issued,
 * and RCM cash payment safe / overdue / paid-late. As-of date is fixed so the
 * illustrative statuses stay stable.
 */
import type { RcmPurchase } from "./types";

export const DEMO_RCM_ASOF = "2026-07-15";

export interface DemoRcmRow {
  purchase: RcmPurchase;
  vendorName: string;
}

export const DEMO_RCM_ROWS: DemoRcmRow[] = [
  {
    vendorName: "Roadside Transport (unregistered)",
    purchase: {
      id: "rcm-overdue",
      vendorId: "v-transport",
      supplierUnregistered: true,
      supplyType: "goods",
      supplyDate: "2026-05-01",
      rcmTaxAmount: 45000,
      selfInvoiceIssued: false,
      rcmTaxPaidDate: null,
    },
  },
  {
    vendorName: "Freelance Design Studio (unregistered)",
    purchase: {
      id: "rcm-selfinvoice-duesoon",
      vendorId: "v-design",
      supplierUnregistered: true,
      supplyType: "services",
      supplyDate: "2026-06-20",
      rcmTaxAmount: 27000,
      selfInvoiceIssued: false,
      rcmTaxPaidDate: null,
    },
  },
  {
    vendorName: "Local Scrap Dealer (unregistered)",
    purchase: {
      id: "rcm-safe",
      vendorId: "v-scrap",
      supplierUnregistered: true,
      supplyType: "goods",
      supplyDate: "2026-07-01",
      rcmTaxAmount: 18000,
      selfInvoiceIssued: false,
      rcmTaxPaidDate: null,
    },
  },
  {
    vendorName: "Legal Advisory LLP (registered — RCM service)",
    purchase: {
      id: "rcm-registered",
      vendorId: "v-legal",
      supplierUnregistered: false,
      supplyType: "services",
      supplyDate: "2026-06-25",
      rcmTaxAmount: 90000,
      selfInvoiceIssued: false,
      rcmTaxPaidDate: null,
    },
  },
  {
    vendorName: "Village Cotton Supplier (unregistered)",
    purchase: {
      id: "rcm-paid-late",
      vendorId: "v-cotton",
      supplierUnregistered: true,
      supplyType: "goods",
      supplyDate: "2026-04-01",
      rcmTaxAmount: 60000,
      selfInvoiceIssued: true,
      rcmTaxPaidDate: "2026-07-01",
    },
  },
];
