import Papa from "papaparse";
import { z } from "zod";

export interface RowError {
  row: number;
  message: string;
}

export interface ParseResult<T> {
  valid: T[];
  errors: RowError[];
}

const TRUE_VALUES = new Set(["true", "1", "yes", "y"]);
const FALSE_VALUES = new Set(["false", "0", "no", "n"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// A generous ceiling so one accidental giant export can't lock up the browser.
const MAX_ROWS = 5000;

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  const s = String(value).trim().toLowerCase();
  if (s === "") return fallback;
  if (TRUE_VALUES.has(s)) return true;
  if (FALSE_VALUES.has(s)) return false;
  throw new Error(`invalid boolean value "${value}"`);
}

function emptyToNull(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

// Tolerate the numeric formatting real exports carry: a ₹ sign, thousands
// commas ("₹1,00,000"), stray spaces, or a leading +. Cells with a comma must
// be quoted in the CSV, otherwise the parser splits them into extra columns.
function toNumber(value: unknown): number {
  const s = String(value ?? "")
    .trim()
    .replace(/[₹,\s]/g, "")
    .replace(/^\+/, "");
  return s === "" ? NaN : Number(s);
}

function requireNumber(value: unknown, field: string): number {
  const n = toNumber(value);
  if (Number.isNaN(n)) {
    throw new Error(`invalid ${field} "${value ?? ""}"`);
  }
  return n;
}

function messageFrom(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((i) => `${i.path.join(".") || "row"}: ${i.message}`)
      .join("; ");
  }
  return error instanceof Error ? error.message : "unknown error";
}

const VendorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  gstin: z.string().min(1),
  gstinActive: z.boolean(),
  udyamRegistered: z.boolean(),
  udyamCategory: z.enum(["micro", "small", "medium"]).nullable(),
});

export type VendorInput = z.infer<typeof VendorSchema>;

const BillSchema = z.object({
  id: z.string().min(1),
  vendorId: z.string().min(1),
  invoiceAcceptanceDate: z.string().regex(ISO_DATE, "expected YYYY-MM-DD"),
  amount: z.number().finite().nonnegative(),
  hasWrittenAgreement: z.boolean(),
  agreedPaymentDays: z.number().int().positive().nullable(),
  paidDate: z.string().regex(ISO_DATE, "expected YYYY-MM-DD").nullable(),
});

export type BillInput = z.infer<typeof BillSchema>;

type RawRow = Record<string, string>;

function parseRows<T>(
  csv: string,
  requiredColumns: string[],
  mapRow: (raw: RawRow) => T
): ParseResult<T> {
  const valid: T[] = [];
  const errors: RowError[] = [];

  const parsed = Papa.parse<RawRow>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  // Header check first: catch the two most common mistakes — uploading the
  // wrong file into this slot, or dropping the header row — with one clear
  // message instead of a cryptic error on every single row.
  const headers = parsed.meta.fields ?? [];
  const missing = requiredColumns.filter((c) => !headers.includes(c));
  if (headers.length === 0 || missing.length === requiredColumns.length) {
    return {
      valid: [],
      errors: [
        {
          row: 1,
          message: `This doesn't look like the right file here. Expected columns like ${requiredColumns.join(
            ", "
          )}. Keep the header row from the sample.`,
        },
      ],
    };
  }
  if (missing.length > 0) {
    return {
      valid: [],
      errors: [
        {
          row: 1,
          message: `Missing ${missing.length > 1 ? "columns" : "column"}: ${missing.join(
            ", "
          )}. Check the header row matches the sample.`,
        },
      ],
    };
  }

  if (parsed.data.length > MAX_ROWS) {
    return {
      valid: [],
      errors: [
        {
          row: 1,
          message: `This file has ${parsed.data.length} rows, over the ${MAX_ROWS}-row limit. Split it into smaller files.`,
        },
      ],
    };
  }

  // Structural problems the parser hit (unbalanced quotes, ragged rows).
  for (const e of parsed.errors) {
    const rowNumber = typeof e.row === "number" ? e.row + 2 : 1;
    errors.push({ row: rowNumber, message: `Could not read this row. Check for stray quotes or commas.` });
  }

  if (parsed.data.length === 0) {
    if (errors.length === 0) {
      errors.push({ row: 1, message: "No data rows found. Add at least one row below the header." });
    }
    return { valid, errors };
  }

  parsed.data.forEach((raw, index) => {
    // +2: one for the header row, one to make it 1-indexed like a spreadsheet.
    const rowNumber = index + 2;
    try {
      valid.push(mapRow(raw));
    } catch (error) {
      errors.push({ row: rowNumber, message: messageFrom(error) });
    }
  });

  return { valid, errors };
}

export function parseVendorsCsv(csv: string): ParseResult<VendorInput> {
  return parseRows(csv, ["id", "name", "gstin"], (raw) =>
    VendorSchema.parse({
      id: (raw.id ?? "").trim(),
      name: (raw.name ?? "").trim(),
      gstin: (raw.gstin ?? "").trim(),
      gstinActive: coerceBoolean(raw.gstinActive, true),
      udyamRegistered: coerceBoolean(raw.udyamRegistered, false),
      udyamCategory: emptyToNull(raw.udyamCategory),
    })
  );
}

export function parseBillsCsv(csv: string): ParseResult<BillInput> {
  return parseRows(csv, ["id", "vendorId", "invoiceAcceptanceDate", "amount"], (raw) => {
    const amount = requireNumber(raw.amount, "amount");

    const rawDays = (raw.agreedPaymentDays ?? "").trim();
    const agreedPaymentDays = rawDays === "" ? null : toNumber(raw.agreedPaymentDays);
    if (agreedPaymentDays !== null && Number.isNaN(agreedPaymentDays)) {
      throw new Error(`invalid agreedPaymentDays "${raw.agreedPaymentDays}"`);
    }

    return BillSchema.parse({
      id: (raw.id ?? "").trim(),
      vendorId: (raw.vendorId ?? "").trim(),
      invoiceAcceptanceDate: (raw.invoiceAcceptanceDate ?? "").trim(),
      amount,
      hasWrittenAgreement: coerceBoolean(raw.hasWrittenAgreement, true),
      agreedPaymentDays,
      paidDate: emptyToNull(raw.paidDate),
    });
  });
}

const TAX_PERIOD = /^\d{4}-\d{2}$/;

const ImsInvoiceSchema = z.object({
  id: z.string().min(1),
  vendorId: z.string().min(1),
  vendorName: z.string().min(1),
  invoiceNo: z.string().min(1),
  taxPeriod: z.string().regex(TAX_PERIOD, "expected YYYY-MM"),
  taxableValue: z.number().finite().nonnegative(),
  gstAmount: z.number().finite().nonnegative(),
  imsAction: z.enum(["accept", "reject", "pending", "none"]),
  eligibility: z.enum(["eligible", "ineligible", "unsure"]),
});

export type ImsInvoiceInput = z.infer<typeof ImsInvoiceSchema>;

export function parseImsCsv(csv: string): ParseResult<ImsInvoiceInput> {
  return parseRows(
    csv,
    ["id", "vendorId", "vendorName", "invoiceNo", "taxPeriod", "taxableValue", "gstAmount", "imsAction", "eligibility"],
    (raw) =>
    ImsInvoiceSchema.parse({
      id: (raw.id ?? "").trim(),
      vendorId: (raw.vendorId ?? "").trim(),
      vendorName: (raw.vendorName ?? "").trim(),
      invoiceNo: (raw.invoiceNo ?? "").trim(),
      taxPeriod: (raw.taxPeriod ?? "").trim(),
      taxableValue: requireNumber(raw.taxableValue, "taxableValue"),
      gstAmount: requireNumber(raw.gstAmount, "gstAmount"),
      imsAction: (raw.imsAction ?? "").trim(),
      eligibility: (raw.eligibility ?? "").trim(),
    })
  );
}

const RcmPurchaseSchema = z.object({
  id: z.string().min(1),
  vendorId: z.string().min(1),
  vendorName: z.string().min(1),
  supplierUnregistered: z.boolean(),
  supplyType: z.enum(["goods", "services"]),
  supplyDate: z.string().regex(ISO_DATE, "expected YYYY-MM-DD"),
  rcmTaxAmount: z.number().finite().nonnegative(),
  selfInvoiceIssued: z.boolean(),
  rcmTaxPaidDate: z.string().regex(ISO_DATE, "expected YYYY-MM-DD").nullable(),
});

export type RcmPurchaseInput = z.infer<typeof RcmPurchaseSchema>;

export function parseRcmCsv(csv: string): ParseResult<RcmPurchaseInput> {
  return parseRows(
    csv,
    ["id", "vendorId", "vendorName", "supplyType", "supplyDate", "rcmTaxAmount"],
    (raw) =>
    RcmPurchaseSchema.parse({
      id: (raw.id ?? "").trim(),
      vendorId: (raw.vendorId ?? "").trim(),
      vendorName: (raw.vendorName ?? "").trim(),
      supplierUnregistered: coerceBoolean(raw.supplierUnregistered, false),
      supplyType: (raw.supplyType ?? "").trim(),
      supplyDate: (raw.supplyDate ?? "").trim(),
      rcmTaxAmount: requireNumber(raw.rcmTaxAmount, "rcmTaxAmount"),
      selfInvoiceIssued: coerceBoolean(raw.selfInvoiceIssued, false),
      rcmTaxPaidDate: emptyToNull(raw.rcmTaxPaidDate),
    })
  );
}

const ComplianceDeadlineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  authority: z.string().min(1),
  period: z.string().min(1),
  dueDate: z.string().regex(ISO_DATE, "expected YYYY-MM-DD"),
  filedDate: z.string().regex(ISO_DATE, "expected YYYY-MM-DD").nullable(),
  proofRef: z.string().nullable(),
});

export type ComplianceDeadlineInput = z.infer<typeof ComplianceDeadlineSchema>;

export function parseComplianceCsv(
  csv: string
): ParseResult<ComplianceDeadlineInput> {
  return parseRows(
    csv,
    ["id", "name", "authority", "period", "dueDate"],
    (raw) =>
    ComplianceDeadlineSchema.parse({
      id: (raw.id ?? "").trim(),
      name: (raw.name ?? "").trim(),
      authority: (raw.authority ?? "").trim(),
      period: (raw.period ?? "").trim(),
      dueDate: (raw.dueDate ?? "").trim(),
      filedDate: emptyToNull(raw.filedDate),
      proofRef: emptyToNull(raw.proofRef),
    })
  );
}
