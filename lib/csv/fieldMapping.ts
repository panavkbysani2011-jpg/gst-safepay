// Flexible-import core: map an arbitrary spreadsheet's columns onto the app's
// canonical fields, whatever the source software named them or however they were
// ordered. This is the deterministic backbone of the import redesign — it lets a
// real-world export (a pharmacy sales register, a Tally purchase dump, a hand-made
// sheet) be understood without forcing the user to rename columns. The AI layer
// (later) only *pre-fills* the suggestions this module already produces; the user
// still confirms every mapping before anything is saved.
//
// Pure + isomorphic (no imports): the same detection runs client-side for the
// live mapping UI and server-side as the authoritative re-check.

export type FieldType = "string" | "number" | "date" | "boolean" | "enum";

export interface TargetField {
  /** Canonical key the rest of the app expects (matches the CSV/zod schemas). */
  key: string;
  label: string;
  required: boolean;
  type: FieldType;
  /** Header names/synonyms real exports use for this field (normalized-compared). */
  aliases: string[];
  /** For type "enum": the allowed canonical values. */
  enumValues?: string[];
  /**
   * Other field keys whose column can stand in for this one when it would
   * otherwise go unmapped. Real exports often identify a supplier by name or
   * GSTIN with no code column at all; the vendor linker resolves any of the
   * three, so blocking the import for a missing "id" would be wrong.
   */
  satisfiedBy?: string[];
}

export type ImportKind =
  | "vendors"
  | "bills"
  | "ims"
  | "rcm"
  | "compliance";

// Field specs mirror the canonical schemas in parseCsv.ts, plus generous aliases
// drawn from how Indian accounting software (Tally, Zoho, Busy, Marg, pharmacy
// POS, etc.) actually labels these columns. Keep aliases lowercase-simple; the
// matcher normalizes both sides (strips spaces/punctuation) before comparing.
export const FIELD_SPECS: Record<ImportKind, TargetField[]> = {
  vendors: [
    { key: "id", label: "Vendor ID / code", required: true, type: "string", aliases: ["id", "vendorid", "vendorcode", "code", "partycode", "supplierid", "suppliercode", "accountcode", "ledgercode"] },
    { key: "name", label: "Vendor name", required: true, type: "string", aliases: ["name", "vendorname", "vendor", "supplier", "suppliername", "party", "partyname", "ledgername", "manufacturer", "company", "companyname"] },
    { key: "gstin", label: "GSTIN", required: true, type: "string", aliases: ["gstin", "gstno", "gstinno", "gstnumber", "gstinnumber", "gst"] },
    { key: "gstinActive", label: "GSTIN active?", required: false, type: "boolean", aliases: ["gstinactive", "active", "gstactive", "isactive", "status"] },
    { key: "udyamRegistered", label: "MSME/Udyam registered?", required: false, type: "boolean", aliases: ["udyamregistered", "udyam", "msme", "msmeregistered", "isudyam", "registered"] },
    { key: "udyamCategory", label: "MSME category", required: false, type: "enum", enumValues: ["micro", "small", "medium"], aliases: ["udyamcategory", "msmecategory", "category", "enterprisetype", "msmetype"] },
  ],
  bills: [
    { key: "id", label: "Bill / invoice no.", required: true, type: "string", aliases: ["id", "billno", "billnumber", "invoiceno", "invoicenumber", "invno", "voucherno", "vchno", "vch", "docno", "documentno", "billid", "sno", "srno", "slno", "serialno", "refno", "reference"] },
    { key: "vendorId", label: "Vendor (id, name or GSTIN)", required: true, type: "string", satisfiedBy: ["vendorName", "vendorGstin"], aliases: ["vendorid", "vendorcode", "vendor", "supplier", "supplierid", "party", "partycode", "partyname", "suppliercode", "manufacturer", "ledgercode"] },
    { key: "invoiceAcceptanceDate", label: "Invoice / bill date", required: true, type: "date", aliases: ["invoiceacceptancedate", "invoicedate", "invoicedt", "invdate", "billdate", "billdt", "date", "docdate", "documentdate", "voucherdate", "vchdate", "trndate", "transactiondate", "acceptancedate", "grndate"] },
    { key: "amount", label: "Amount", required: true, type: "number", aliases: ["amount", "invoiceamount", "billamount", "value", "invoicevalue", "netamount", "total", "totalamount", "taxablevalue", "grossamount", "billedamount"] },
    { key: "hasWrittenAgreement", label: "Written agreement?", required: false, type: "boolean", aliases: ["haswrittenagreement", "writtenagreement", "agreement", "hasagreement", "contract"] },
    { key: "agreedPaymentDays", label: "Agreed payment term (days)", required: false, type: "number", aliases: ["agreedpaymentdays", "paymentdays", "creditdays", "creditperiod", "terms", "paymentterms", "duedays"] },
    { key: "paidDate", label: "Paid date", required: false, type: "date", aliases: ["paiddate", "paymentdate", "settleddate", "clearingdate", "paidon"] },
    // Optional, and only used to link (or create) the vendor accurately — these
    // are not stored on the bill itself.
    { key: "vendorName", label: "Vendor name (to match/create)", required: false, type: "string", aliases: ["vendorname", "suppliername", "partyname", "ledgername", "ledger", "accountname", "manufacturer", "companyname"] },
    { key: "vendorGstin", label: "Vendor GSTIN (to match/create)", required: false, type: "string", aliases: ["vendorgstin", "suppliergstin", "partygstin", "gstin", "gstno", "gstinno"] },
  ],
  ims: [
    { key: "id", label: "Record ID", required: true, type: "string", aliases: ["id", "invoiceid", "recordid", "srno", "slno", "serialno"] },
    { key: "vendorId", label: "Vendor ID / GSTIN", required: true, type: "string", satisfiedBy: ["vendorName"], aliases: ["vendorid", "vendorcode", "supplierid", "suppliergstin", "gstin", "party"] },
    { key: "vendorName", label: "Vendor name", required: true, type: "string", aliases: ["vendorname", "vendor", "supplier", "suppliername", "party", "partyname"] },
    { key: "invoiceNo", label: "Invoice no.", required: true, type: "string", aliases: ["invoiceno", "invoicenumber", "billno", "docno", "invoice"] },
    { key: "taxPeriod", label: "Tax period (YYYY-MM)", required: true, type: "string", aliases: ["taxperiod", "period", "returnperiod", "month", "taxmonth"] },
    { key: "taxableValue", label: "Taxable value", required: true, type: "number", aliases: ["taxablevalue", "taxable", "value", "netvalue", "basicamount", "assessablevalue"] },
    { key: "gstAmount", label: "GST amount (ITC)", required: true, type: "number", aliases: ["gstamount", "gst", "taxamount", "totaltax", "itc", "inputtaxcredit", "igst", "cgst", "sgst"] },
    { key: "imsAction", label: "IMS action", required: false, type: "enum", enumValues: ["accept", "reject", "pending", "none"], aliases: ["imsaction", "action", "status", "imsstatus"] },
    { key: "eligibility", label: "ITC eligibility", required: false, type: "enum", enumValues: ["eligible", "ineligible", "unsure"], aliases: ["eligibility", "itceligibility", "eligible", "itcstatus"] },
  ],
  rcm: [
    { key: "id", label: "Record ID", required: true, type: "string", aliases: ["id", "recordid", "srno", "slno", "purchaseid"] },
    { key: "vendorId", label: "Vendor ID / code", required: true, type: "string", satisfiedBy: ["vendorName"], aliases: ["vendorid", "vendorcode", "supplierid", "party", "partycode"] },
    { key: "vendorName", label: "Vendor name", required: true, type: "string", aliases: ["vendorname", "vendor", "supplier", "suppliername", "party", "partyname"] },
    { key: "supplierUnregistered", label: "Supplier unregistered?", required: false, type: "boolean", aliases: ["supplierunregistered", "unregistered", "isunregistered", "urd", "unregistereddealer"] },
    { key: "supplyType", label: "Supply type", required: false, type: "enum", enumValues: ["goods", "services"], aliases: ["supplytype", "type", "goodsorservices", "natureofsupply"] },
    { key: "supplyDate", label: "Supply date", required: true, type: "date", aliases: ["supplydate", "date", "invoicedate", "receiptdate", "docdate"] },
    { key: "rcmTaxAmount", label: "RCM tax amount", required: true, type: "number", aliases: ["rcmtaxamount", "rcmtax", "taxamount", "gstamount", "reversechargetax", "tax"] },
    { key: "selfInvoiceIssued", label: "Self-invoice issued?", required: false, type: "boolean", aliases: ["selfinvoiceissued", "selfinvoice", "selfinvoicedone", "isselfinvoiced"] },
    { key: "rcmTaxPaidDate", label: "RCM tax paid date", required: false, type: "date", aliases: ["rcmtaxpaiddate", "paiddate", "paymentdate", "taxpaiddate"] },
  ],
  compliance: [
    { key: "id", label: "Record ID", required: true, type: "string", aliases: ["id", "recordid", "srno", "slno"] },
    { key: "name", label: "Filing name", required: true, type: "string", aliases: ["name", "filing", "filingname", "return", "returnname", "form", "formname", "obligation"] },
    { key: "authority", label: "Authority", required: true, type: "string", aliases: ["authority", "department", "regulator", "act"] },
    { key: "period", label: "Period", required: true, type: "string", aliases: ["period", "taxperiod", "returnperiod", "month", "financialyear", "fy"] },
    { key: "dueDate", label: "Due date", required: true, type: "date", aliases: ["duedate", "date", "deadline", "duedon"] },
    { key: "filedDate", label: "Filed date", required: false, type: "date", aliases: ["fileddate", "dateoffiling", "filingdate", "submitteddate"] },
    { key: "proofRef", label: "Proof reference", required: false, type: "string", aliases: ["proofref", "arn", "acknowledgementno", "challanno", "reference", "ackno"] },
  ],
};

/** Lowercase and strip everything but letters/digits, so "Bill Date", "bill_date" and "BILLDATE" all compare equal. */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Score how well a source header matches a target field (0 = no match).
 * Exact alias/key match wins; otherwise reward alias-as-substring both ways so
 * "SupplierGSTINNo" still matches the "gstin" field. Longer overlaps score higher
 * so the best-fitting column wins when several are plausible.
 */
function matchScore(normHeader: string, field: TargetField): number {
  const candidates = [field.key.toLowerCase(), ...field.aliases].map(normalizeHeader);
  let best = 0;
  for (const cand of candidates) {
    if (!cand) continue;
    if (normHeader === cand) {
      best = Math.max(best, 1000 + cand.length); // exact match, prefer the longer alias
    } else if (normHeader.includes(cand)) {
      best = Math.max(best, 500 + cand.length); // header contains the alias ("supplierparty" ⊇ "party")
    } else if (cand.includes(normHeader) && normHeader.length >= 3) {
      best = Math.max(best, 200 + normHeader.length); // alias contains the header
    }
  }
  return best;
}

export interface SuggestedMapping {
  /** field key -> chosen source header (or null if nothing matched). */
  mapping: Record<string, string | null>;
  /** required field keys with no confident match — the user must map these. */
  unmappedRequired: string[];
}

/**
 * Suggest a column mapping for the given headers. Greedy: assign each field its
 * best available header, strongest matches first, never reusing a header. The
 * result is a *suggestion* — the UI shows it pre-filled and the user can change
 * any row before confirming.
 */
export function suggestMapping(
  headers: string[],
  fields: TargetField[]
): SuggestedMapping {
  const normHeaders = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));

  // Score every (field, header) pair, then assign greedily by descending score.
  const pairs: { fieldKey: string; header: string; score: number }[] = [];
  for (const field of fields) {
    for (const h of normHeaders) {
      const score = matchScore(h.norm, field);
      if (score > 0) pairs.push({ fieldKey: field.key, header: h.raw, score });
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  const mapping: Record<string, string | null> = {};
  for (const f of fields) mapping[f.key] = null;
  const usedHeaders = new Set<string>();
  for (const p of pairs) {
    if (mapping[p.fieldKey] !== null) continue; // field already assigned
    if (usedHeaders.has(p.header)) continue; // header already used
    mapping[p.fieldKey] = p.header;
    usedHeaders.add(p.header);
  }

  // Backfill: a required field can borrow the column of an equivalent field
  // (e.g. a bill's vendor "id" is satisfied by the supplier's name or GSTIN,
  // which the vendor linker resolves just as well). Sharing the column is
  // correct here, so this deliberately ignores the no-reuse rule above.
  for (const f of fields) {
    if (!f.required || mapping[f.key] !== null || !f.satisfiedBy) continue;
    for (const altKey of f.satisfiedBy) {
      const alt = mapping[altKey];
      if (alt) {
        mapping[f.key] = alt;
        break;
      }
    }
  }

  const unmappedRequired = fields
    .filter((f) => f.required && mapping[f.key] === null)
    .map((f) => f.key);

  return { mapping, unmappedRequired };
}

// --- Value normalization ---------------------------------------------------
// Real exports carry values in shapes the strict validators reject. Normalize
// here (in the mapping layer) so a spreadsheet's native formats become the
// canonical forms the existing parseCsv validators already accept.

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30); // Excel serial 0; day 25569 = 1970-01-01.
const MS_PER_DAY = 86_400_000;

/** Excel/Sheets serial day number -> "YYYY-MM-DD" (UTC), or null if out of range. */
export function excelSerialToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0 || serial > 60000) return null;
  const ms = EXCEL_EPOCH_MS + Math.round(serial) * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Coerce a spreadsheet date-cell into ISO "YYYY-MM-DD". Handles: already-ISO,
 * Excel serial numbers, and common Indian formats (dd/mm/yyyy, dd-mm-yyyy,
 * dd.mm.yyyy, with 2- or 4-digit years). Returns null if it can't be parsed —
 * the downstream validator then reports it rather than guessing wrong.
 */
export function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s === "") return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // already ISO

  // Bare number => Excel serial.
  if (/^\d+(\.\d+)?$/.test(s)) return excelSerialToIso(Number(s));

  // dd/mm/yyyy family (day-first, the Indian convention).
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);
    if (m[3].length === 2) year += year < 70 ? 2000 : 1900;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }
  return null;
}

/** Strip currency symbols, thousands separators and spaces; return a number or null. */
export function toNumberLoose(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const s = String(value)
    .trim()
    .replace(/[₹$,\s]/gu, "")
    .replace(/^\+/, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const TRUE_WORDS = new Set(["true", "1", "yes", "y", "t", "active"]);
const FALSE_WORDS = new Set(["false", "0", "no", "n", "f", "inactive"]);

/** Coerce loose truthy/falsey cell text; null if genuinely ambiguous. */
export function toBooleanLoose(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim().toLowerCase();
  if (s === "") return null;
  if (TRUE_WORDS.has(s)) return true;
  if (FALSE_WORDS.has(s)) return false;
  return null;
}

// --- Applying a mapping ----------------------------------------------------
// Once the user has confirmed a mapping, transform their raw rows into the app's
// canonical shape. A valid value is normalized to its canonical form; an
// unparseable one is passed through as-is so the existing zod validator reports
// it (we never silently blank or fabricate a value).

function normalizeCell(value: unknown, type: FieldType): string {
  const s = value === null || value === undefined ? "" : String(value).trim();
  if (s === "") return "";
  switch (type) {
    case "date":
      return toIsoDate(s) ?? s;
    case "number": {
      const n = toNumberLoose(s);
      return n === null ? s : String(n);
    }
    case "boolean": {
      const b = toBooleanLoose(s);
      return b === null ? s : b ? "true" : "false";
    }
    case "enum":
      return s.toLowerCase();
    default:
      return s;
  }
}

/**
 * Transform raw rows (keyed by the file's own headers) into canonical rows
 * (keyed by the app's field keys), applying per-field normalization. Unmapped
 * fields become empty — the downstream validator applies its own defaults.
 */
export function applyMapping(
  rawRows: Record<string, unknown>[],
  mapping: Record<string, string | null>,
  fields: TargetField[]
): Record<string, string>[] {
  return rawRows.map((row) => {
    const out: Record<string, string> = {};
    for (const f of fields) {
      const sourceHeader = mapping[f.key];
      const raw = sourceHeader ? row[sourceHeader] : "";
      out[f.key] = normalizeCell(raw, f.type);
    }
    return out;
  });
}

// --- AI-proposed mappings (validated, never trusted) -----------------------
// The optional AI layer only ever *suggests* a mapping. Its raw output is
// untrusted text, so it is parsed defensively and every column it names is
// checked against the file's real headers. Anything malformed, hallucinated, or
// unknown is dropped — the deterministic matcher remains the floor, and the user
// still confirms before a single row is saved.

/**
 * Parse an LLM's mapping reply into a validated {fieldKey: header|null} map.
 * Tolerates markdown fences and extra prose. Returns null if the reply isn't
 * usable at all, so callers fall back to deterministic matching.
 */
export function parseAiMappingResponse(
  text: string,
  headers: string[],
  fields: TargetField[]
): Record<string, string | null> | null {
  if (!text) return null;
  // Models often wrap JSON in ```json fences or add a sentence around it.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;

  const headerSet = new Set(headers);
  const record = raw as Record<string, unknown>;
  const out: Record<string, string | null> = {};
  for (const f of fields) {
    const value = record[f.key];
    // Only accept a string naming a column that genuinely exists in this file.
    out[f.key] = typeof value === "string" && headerSet.has(value) ? value : null;
  }
  return out;
}

/**
 * Merge a validated AI proposal onto the deterministic mapping. The
 * deterministic match always wins where it found one (it is exact and
 * explainable); the AI only fills fields it left unmapped, and never reuses a
 * column already claimed. Returns which fields the AI supplied so the UI can
 * flag them for review.
 */
export function mergeAiProposal(
  base: Record<string, string | null>,
  ai: Record<string, string | null> | null,
  fields: TargetField[]
): { mapping: Record<string, string | null>; aiFilled: string[] } {
  const mapping: Record<string, string | null> = { ...base };
  const aiFilled: string[] = [];
  if (!ai) return { mapping, aiFilled };

  const used = new Set(Object.values(mapping).filter((v): v is string => v !== null));
  for (const f of fields) {
    if (mapping[f.key] !== null) continue; // deterministic match stands
    const proposed = ai[f.key];
    if (!proposed || used.has(proposed)) continue;
    mapping[f.key] = proposed;
    used.add(proposed);
    aiFilled.push(f.key);
  }
  return { mapping, aiFilled };
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Serialize canonical rows to a CSV string whose header row is the app's field
 * keys — exactly what the existing parseXCsv validators expect. This lets the
 * whole flexible-import path reuse the current validation + server pipeline
 * unchanged: the canonical CSV is submitted in place of the raw file.
 */
export function toCanonicalCsv(
  rows: Record<string, string>[],
  fields: TargetField[]
): string {
  const header = fields.map((f) => f.key);
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(header.map((k) => csvEscape(row[k] ?? "")).join(","));
  }
  return lines.join("\n");
}
