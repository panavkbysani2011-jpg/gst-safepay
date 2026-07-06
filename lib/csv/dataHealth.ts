// Deterministic data-health checks for imported CSVs — the honest, free
// "verify my upload" layer. These are ADVISORY warnings (the row still imports):
// they catch likely data-entry mistakes that would otherwise produce wrong money
// figures. No AI, no network — pure rules run right where the file is parsed, so
// nothing leaves the browser. Warnings are keyed by the row's business id + a label.
import { isValidGstin } from "@/lib/rules/gstin";
import type {
  BillInput,
  ComplianceDeadlineInput,
  ImsInvoiceInput,
  RcmPurchaseInput,
  VendorInput,
} from "./parseCsv";

export interface HealthWarning {
  id: string;
  label: string;
  message: string;
}

const CRORE = 10_000_000;
const HUGE_AMOUNT = 100 * CRORE; // ₹100 cr — almost always a typo (extra zeros)
const MAX_PAYMENT_TERM_DAYS = 365;

function croreLabel(amount: number): string {
  return `₹${(amount / CRORE).toFixed(1)} cr`;
}

/** Ids appearing more than once in the batch (last-write-wins on upsert → silent overwrite). */
function duplicateIds<T extends { id: string }>(rows: T[]): Set<string> {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.id)) dupes.add(r.id);
    else seen.add(r.id);
  }
  return dupes;
}

export function checkVendorsHealth(rows: VendorInput[]): HealthWarning[] {
  const out: HealthWarning[] = [];
  const dupes = duplicateIds(rows);
  for (const v of rows) {
    if (!isValidGstin(v.gstin)) {
      out.push({
        id: v.id,
        label: v.name,
        message: `GSTIN "${v.gstin}" fails the checksum. Verify it before claiming input-tax-credit.`,
      });
    }
    if (v.udyamRegistered && v.udyamCategory === null) {
      out.push({
        id: v.id,
        label: v.name,
        message: "Marked MSME-registered but has no category. The 45-day rule needs micro, small or medium.",
      });
    }
    if (dupes.has(v.id)) {
      out.push({ id: v.id, label: v.name, message: `Duplicate id "${v.id}" in this file, so only the last row is kept.` });
    }
  }
  return out;
}

export function checkBillsHealth(rows: BillInput[], asOf: string): HealthWarning[] {
  const out: HealthWarning[] = [];
  const dupes = duplicateIds(rows);
  for (const b of rows) {
    if (b.amount <= 0) {
      out.push({ id: b.id, label: b.id, message: "Amount is zero or negative." });
    } else if (b.amount > HUGE_AMOUNT) {
      out.push({ id: b.id, label: b.id, message: `Amount is unusually large (${croreLabel(b.amount)}). Check for extra zeros.` });
    }
    if (b.invoiceAcceptanceDate > asOf) {
      out.push({ id: b.id, label: b.id, message: `Invoice date ${b.invoiceAcceptanceDate} is in the future.` });
    }
    if (b.paidDate !== null && b.paidDate < b.invoiceAcceptanceDate) {
      out.push({ id: b.id, label: b.id, message: "Paid date is before the invoice date." });
    }
    if (b.agreedPaymentDays !== null && (b.agreedPaymentDays <= 0 || b.agreedPaymentDays > MAX_PAYMENT_TERM_DAYS)) {
      out.push({ id: b.id, label: b.id, message: `Agreed payment term (${b.agreedPaymentDays} days) looks off.` });
    }
    if (dupes.has(b.id)) {
      out.push({ id: b.id, label: b.id, message: `Duplicate id "${b.id}" in this file, so only the last row is kept.` });
    }
  }
  return out;
}

export function checkImsHealth(rows: ImsInvoiceInput[]): HealthWarning[] {
  const out: HealthWarning[] = [];
  const dupes = duplicateIds(rows);
  for (const inv of rows) {
    if (inv.taxableValue <= 0) {
      out.push({ id: inv.id, label: inv.invoiceNo, message: "Taxable value is zero or negative." });
    }
    if (inv.gstAmount > inv.taxableValue) {
      out.push({ id: inv.id, label: inv.invoiceNo, message: "GST amount exceeds the taxable value. Check that the columns aren't swapped." });
    }
    if (dupes.has(inv.id)) {
      out.push({ id: inv.id, label: inv.invoiceNo, message: `Duplicate id "${inv.id}" in this file, so only the last row is kept.` });
    }
  }
  return out;
}

export function checkRcmHealth(rows: RcmPurchaseInput[], asOf: string): HealthWarning[] {
  const out: HealthWarning[] = [];
  const dupes = duplicateIds(rows);
  for (const p of rows) {
    if (p.rcmTaxAmount <= 0) {
      out.push({ id: p.id, label: p.vendorName, message: "RCM tax amount is zero or negative." });
    }
    if (p.supplyDate > asOf) {
      out.push({ id: p.id, label: p.vendorName, message: `Supply date ${p.supplyDate} is in the future.` });
    }
    if (p.rcmTaxPaidDate !== null && p.rcmTaxPaidDate < p.supplyDate) {
      out.push({ id: p.id, label: p.vendorName, message: "RCM tax paid date is before the supply date." });
    }
    if (dupes.has(p.id)) {
      out.push({ id: p.id, label: p.vendorName, message: `Duplicate id "${p.id}" in this file, so only the last row is kept.` });
    }
  }
  return out;
}

export function checkComplianceHealth(rows: ComplianceDeadlineInput[], asOf: string): HealthWarning[] {
  const out: HealthWarning[] = [];
  const dupes = duplicateIds(rows);
  for (const d of rows) {
    if (d.filedDate !== null && d.filedDate > asOf) {
      out.push({ id: d.id, label: d.name, message: `Filed date ${d.filedDate} is in the future.` });
    }
    if (dupes.has(d.id)) {
      out.push({ id: d.id, label: d.name, message: `Duplicate id "${d.id}" in this file, so only the last row is kept.` });
    }
  }
  return out;
}
