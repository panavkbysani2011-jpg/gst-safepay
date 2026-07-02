/**
 * SYNTHETIC DEMO DATA — not a real business. Exercises every status the
 * dashboard needs to show (safe, due-soon, breached, paid-late, paid-on-time,
 * not-applicable) so the UI can be built and verified before real customer data exists.
 */
import type { Bill, Vendor } from "./types";

export const TODAY = "2026-07-02";

export const DEMO_VENDORS: Vendor[] = [
  {
    id: "v-steelworks",
    name: "Bharath Steelworks (Micro)",
    gstin: "29AACCB1234F1Z5",
    gstinActive: true,
    udyamRegistered: true,
    udyamCategory: "micro",
  },
  {
    id: "v-packaging",
    name: "Sundar Packaging Co (Small)",
    gstin: "29AAECS5678G1Z2",
    gstinActive: true,
    udyamRegistered: true,
    udyamCategory: "small",
  },
  {
    id: "v-logistics",
    name: "Metro Logistics (Small, no agreement on file)",
    gstin: "29AADCM4321H1Z9",
    gstinActive: true,
    udyamRegistered: true,
    udyamCategory: "small",
  },
  {
    id: "v-enterprise",
    name: "Apex Industrial Supplies (Medium)",
    gstin: "29AAFCA9988J1Z3",
    gstinActive: true,
    udyamRegistered: true,
    udyamCategory: "medium",
  },
  {
    id: "v-nonmsme",
    name: "Global Traders LLP (not Udyam-registered)",
    gstin: "29AAGCT5566K1Z1",
    gstinActive: true,
    udyamRegistered: false,
    udyamCategory: null,
  },
];

export const DEMO_BILLS: Bill[] = [
  {
    id: "bill-breach-1",
    vendorId: "v-steelworks",
    invoiceAcceptanceDate: "2026-04-01",
    amount: 340000,
    hasWrittenAgreement: true,
    agreedPaymentDays: 45,
    paidDate: null,
  },
  {
    id: "bill-duesoon-1",
    vendorId: "v-packaging",
    invoiceAcceptanceDate: "2026-05-20",
    amount: 120000,
    hasWrittenAgreement: true,
    agreedPaymentDays: 45,
    paidDate: null,
  },
  {
    id: "bill-duesoon-2",
    vendorId: "v-logistics",
    invoiceAcceptanceDate: "2026-06-22",
    amount: 60000,
    hasWrittenAgreement: false,
    agreedPaymentDays: null,
    paidDate: null,
  },
  {
    id: "bill-safe-1",
    vendorId: "v-steelworks",
    invoiceAcceptanceDate: "2026-06-25",
    amount: 90000,
    hasWrittenAgreement: true,
    agreedPaymentDays: 45,
    paidDate: null,
  },
  {
    id: "bill-paidlate-1",
    vendorId: "v-packaging",
    invoiceAcceptanceDate: "2026-04-01",
    amount: 200000,
    hasWrittenAgreement: true,
    agreedPaymentDays: 45,
    paidDate: "2026-06-01",
  },
  {
    id: "bill-paidontime-1",
    vendorId: "v-steelworks",
    invoiceAcceptanceDate: "2026-06-01",
    amount: 75000,
    hasWrittenAgreement: true,
    agreedPaymentDays: 45,
    paidDate: "2026-06-20",
  },
  {
    id: "bill-medium-1",
    vendorId: "v-enterprise",
    invoiceAcceptanceDate: "2026-03-01",
    amount: 500000,
    hasWrittenAgreement: true,
    agreedPaymentDays: 60,
    paidDate: null,
  },
  {
    id: "bill-nonmsme-1",
    vendorId: "v-nonmsme",
    invoiceAcceptanceDate: "2026-03-01",
    amount: 150000,
    hasWrittenAgreement: false,
    agreedPaymentDays: null,
    paidDate: null,
  },
];
