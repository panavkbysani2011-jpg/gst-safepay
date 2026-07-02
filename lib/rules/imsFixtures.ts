/**
 * SYNTHETIC DEMO DATA — not a real business. Exercises every IMS status
 * (accepted, pending, action-required, deemed-accept-imminent,
 * auto-accepted-missed with unknown and known-ineligible ITC) so the IMS panel
 * can be built and shown before real GST data exists. As-of date is fixed so
 * the illustrative statuses stay stable.
 */
import type { ImsInvoice } from "./types";

export const DEMO_IMS_ASOF = "2026-07-13";

export interface DemoImsRow {
  invoice: ImsInvoice;
  vendorName: string;
}

export const DEMO_IMS_ROWS: DemoImsRow[] = [
  {
    vendorName: "Bharath Steelworks",
    invoice: {
      id: "ims-accepted",
      vendorId: "v-steelworks",
      invoiceNo: "BS/2026/312",
      taxPeriod: "2026-06",
      taxableValue: 500000,
      gstAmount: 90000,
      imsAction: "accept",
      eligibility: "eligible",
    },
  },
  {
    vendorName: "Sundar Packaging Co",
    invoice: {
      id: "ims-action-required",
      vendorId: "v-packaging",
      invoiceNo: "SPC-1189",
      taxPeriod: "2026-07",
      taxableValue: 300000,
      gstAmount: 54000,
      imsAction: "none",
      eligibility: "unsure",
    },
  },
  {
    vendorName: "Metro Logistics",
    invoice: {
      id: "ims-imminent",
      vendorId: "v-logistics",
      invoiceNo: "ML-4471",
      taxPeriod: "2026-06",
      taxableValue: 175000,
      gstAmount: 31500,
      imsAction: "none",
      eligibility: "unsure",
    },
  },
  {
    vendorName: "Apex Industrial Supplies",
    invoice: {
      id: "ims-missed-unsure",
      vendorId: "v-enterprise",
      invoiceNo: "AIS/887",
      taxPeriod: "2026-05",
      taxableValue: 233000,
      gstAmount: 42000,
      imsAction: "none",
      eligibility: "unsure",
    },
  },
  {
    vendorName: "Quicksale Traders (invoice disputed)",
    invoice: {
      id: "ims-missed-ineligible",
      vendorId: "v-quicksale",
      invoiceNo: "QT-2205",
      taxPeriod: "2026-05",
      taxableValue: 500000,
      gstAmount: 90000,
      imsAction: "none",
      eligibility: "ineligible",
    },
  },
  {
    vendorName: "Sundar Packaging Co",
    invoice: {
      id: "ims-pending",
      vendorId: "v-packaging",
      invoiceNo: "SPC-1204",
      taxPeriod: "2026-06",
      taxableValue: 66000,
      gstAmount: 11880,
      imsAction: "pending",
      eligibility: "unsure",
    },
  },
];
