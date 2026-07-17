import { describe, it, expect } from "vitest";
import {
  FIELD_SPECS,
  suggestMapping,
  normalizeHeader,
  excelSerialToIso,
  toIsoDate,
  toNumberLoose,
  toBooleanLoose,
  applyMapping,
  toCanonicalCsv,
  parseAiMappingResponse,
  mergeAiProposal,
} from "./fieldMapping";
import { parseBillsCsv } from "./parseCsv";

describe("normalizeHeader", () => {
  it("collapses case, spaces and punctuation so variants compare equal", () => {
    expect(normalizeHeader("Bill Date")).toBe("billdate");
    expect(normalizeHeader("bill_date")).toBe("billdate");
    expect(normalizeHeader("BILLDATE")).toBe("billdate");
    expect(normalizeHeader("GSTIN No.")).toBe("gstinno");
  });
});

describe("suggestMapping — vendors, reordered + renamed", () => {
  it("maps common accounting-software headers to canonical fields", () => {
    const headers = ["Party Name", "Supplier Code", "GST No", "MSME Category"];
    const { mapping } = suggestMapping(headers, FIELD_SPECS.vendors);
    expect(mapping.name).toBe("Party Name");
    expect(mapping.id).toBe("Supplier Code");
    expect(mapping.gstin).toBe("GST No");
    expect(mapping.udyamCategory).toBe("MSME Category");
  });

  it("flags required fields it cannot find", () => {
    const { unmappedRequired } = suggestMapping(["Foo", "Bar"], FIELD_SPECS.vendors);
    expect(unmappedRequired).toContain("id");
    expect(unmappedRequired).toContain("name");
    expect(unmappedRequired).toContain("gstin");
  });

  it("never assigns the same source column to two fields", () => {
    const headers = ["Name", "GSTIN"];
    const { mapping } = suggestMapping(headers, FIELD_SPECS.vendors);
    const used = Object.values(mapping).filter((v): v is string => v !== null);
    expect(new Set(used).size).toBe(used.length);
  });
});

describe("suggestMapping — the real pharmacy sales export (44 columns)", () => {
  // The exact header row from SalesBillNo776057.xls, a real pharmacy POS export.
  const pharmacyHeaders = [
    "BillNo", "BillDate", "CustCode", "BillType", "BillMode", "Manufacturer",
    "ItemCode", "ProductName", "Packing", "UnitQty", "BatchNo", "ExpDate",
    "BilledQty", "FreeQty", "BilledRate", "MRP", "TaxPercent", "TaxType",
    "MrpTaxFlag", "CashDisPercent", "SplDisPercent", "DutyRate", "Ptr", "Remark",
    "TaxCollectedOn", "ExpiryDate", "BilledBy", "ProHsnNo",
  ];

  it("auto-detects the sensible bill columns without any renaming by the user", () => {
    const { mapping, unmappedRequired } = suggestMapping(pharmacyHeaders, FIELD_SPECS.bills);
    // These are the matches a human would make — proving arbitrary real headers work.
    expect(mapping.id).toBe("BillNo");
    expect(mapping.invoiceAcceptanceDate).toBe("BillDate");
    expect(mapping.vendorId).toBe("Manufacturer");
    // "amount" is deliberately NOT auto-guessed: this file has no single amount
    // column (it is BilledRate x BilledQty), so the detector leaves it for the
    // user to map/derive rather than guessing money wrong. Safe-by-default.
    expect(mapping.amount).toBeNull();
    expect(unmappedRequired).toContain("amount");
  });
});

describe("excelSerialToIso", () => {
  it("anchors on the well-known serial 25569 = 1970-01-01", () => {
    expect(excelSerialToIso(25569)).toBe("1970-01-01");
  });
  it("converts the real bill's BillDate serial (45698) to a 2025 date", () => {
    expect(excelSerialToIso(45698)?.startsWith("2025")).toBe(true);
  });
  it("rejects nonsense serials", () => {
    expect(excelSerialToIso(0)).toBeNull();
    expect(excelSerialToIso(-5)).toBeNull();
  });
});

describe("toIsoDate", () => {
  it("passes ISO through unchanged", () => {
    expect(toIsoDate("2026-06-15")).toBe("2026-06-15");
  });
  it("treats a bare number as an Excel serial", () => {
    expect(toIsoDate(45698)?.startsWith("2025")).toBe(true);
  });
  it("parses day-first dd/mm/yyyy and dd-mm-yyyy", () => {
    expect(toIsoDate("15/06/2026")).toBe("2026-06-15");
    expect(toIsoDate("15-06-2026")).toBe("2026-06-15");
    expect(toIsoDate("05.01.2026")).toBe("2026-01-05");
  });
  it("expands 2-digit years", () => {
    expect(toIsoDate("15/06/26")).toBe("2026-06-15");
  });
  it("returns null for the unparseable (so the validator flags it, not a wrong guess)", () => {
    expect(toIsoDate("June 15")).toBeNull();
    expect(toIsoDate("")).toBeNull();
  });
});

describe("toNumberLoose", () => {
  it("strips rupee signs and Indian thousands commas", () => {
    expect(toNumberLoose("₹1,00,000")).toBe(100000);
    expect(toNumberLoose("1,234.50")).toBe(1234.5);
    expect(toNumberLoose(500)).toBe(500);
  });
  it("returns null for non-numbers", () => {
    expect(toNumberLoose("N/A")).toBeNull();
    expect(toNumberLoose("")).toBeNull();
  });
});

describe("toBooleanLoose", () => {
  it("accepts common truthy/falsey words", () => {
    expect(toBooleanLoose("Yes")).toBe(true);
    expect(toBooleanLoose("active")).toBe(true);
    expect(toBooleanLoose("0")).toBe(false);
    expect(toBooleanLoose("No")).toBe(false);
  });
  it("returns null when genuinely ambiguous", () => {
    expect(toBooleanLoose("maybe")).toBeNull();
  });
});

describe("applyMapping + toCanonicalCsv", () => {
  it("transforms raw vendor rows into canonical, normalized rows", () => {
    const raw = [
      { "Party Name": "Acme Pharma", "Supplier Code": "V1", "GST No": "29ABCDE1234F1Z5", "MSME Category": "Small" },
    ];
    const mapping = {
      id: "Supplier Code",
      name: "Party Name",
      gstin: "GST No",
      gstinActive: null,
      udyamRegistered: null,
      udyamCategory: "MSME Category",
    };
    const rows = applyMapping(raw, mapping, FIELD_SPECS.vendors);
    expect(rows[0].id).toBe("V1");
    expect(rows[0].name).toBe("Acme Pharma");
    expect(rows[0].gstin).toBe("29ABCDE1234F1Z5");
    expect(rows[0].udyamCategory).toBe("small"); // enum lowercased
    expect(rows[0].gstinActive).toBe(""); // unmapped -> blank, validator applies default
  });

  it("normalizes Excel-serial dates and rupee amounts when mapping bills", () => {
    const raw = [
      { BillNo: "776057", BillDate: "45698", Amt: "₹1,00,000" },
    ];
    const mapping = {
      id: "BillNo",
      vendorId: null,
      invoiceAcceptanceDate: "BillDate",
      amount: "Amt",
      hasWrittenAgreement: null,
      agreedPaymentDays: null,
      paidDate: null,
    };
    const rows = applyMapping(raw, mapping, FIELD_SPECS.bills);
    expect(rows[0].id).toBe("776057");
    expect(rows[0].invoiceAcceptanceDate.startsWith("2025")).toBe(true); // serial -> ISO
    expect(rows[0].amount).toBe("100000"); // ₹ + commas stripped
  });

  it("produces a canonical CSV whose header is the app's field keys", () => {
    const rows = [{ id: "V1", name: "Acme, Inc", gstin: "G1", gstinActive: "", udyamRegistered: "", udyamCategory: "" }];
    const csv = toCanonicalCsv(rows, FIELD_SPECS.vendors);
    const [header, first] = csv.split("\n");
    expect(header).toBe("id,name,gstin,gstinActive,udyamRegistered,udyamCategory");
    expect(first).toContain('"Acme, Inc"'); // comma-containing cell is quoted
  });
});

describe("parseAiMappingResponse — untrusted AI output is validated, never believed", () => {
  const headers = ["Bill No", "Party", "Bill Date", "Net Amount"];

  it("accepts a clean JSON reply, keeping only real columns", () => {
    const reply = '{"id":"Bill No","vendorId":"Party","invoiceAcceptanceDate":"Bill Date","amount":"Net Amount"}';
    const out = parseAiMappingResponse(reply, headers, FIELD_SPECS.bills);
    expect(out?.id).toBe("Bill No");
    expect(out?.amount).toBe("Net Amount");
  });

  it("tolerates markdown fences and surrounding prose", () => {
    const reply = 'Sure! Here is the mapping:\n```json\n{"id":"Bill No"}\n```\nHope that helps.';
    const out = parseAiMappingResponse(reply, headers, FIELD_SPECS.bills);
    expect(out?.id).toBe("Bill No");
  });

  it("DROPS a hallucinated column that is not in the file", () => {
    const reply = '{"id":"Bill No","amount":"Grand Total XYZ"}'; // second column doesn't exist
    const out = parseAiMappingResponse(reply, headers, FIELD_SPECS.bills);
    expect(out?.id).toBe("Bill No");
    expect(out?.amount).toBeNull(); // hallucination rejected
  });

  it("ignores unknown field keys the model invents", () => {
    const reply = '{"id":"Bill No","totallyMadeUpField":"Party"}';
    const out = parseAiMappingResponse(reply, headers, FIELD_SPECS.bills);
    expect(out).not.toHaveProperty("totallyMadeUpField");
  });

  it("returns null on unusable replies so callers fall back to deterministic", () => {
    expect(parseAiMappingResponse("I'm not sure, sorry!", headers, FIELD_SPECS.bills)).toBeNull();
    expect(parseAiMappingResponse("", headers, FIELD_SPECS.bills)).toBeNull();
    expect(parseAiMappingResponse("{not valid json", headers, FIELD_SPECS.bills)).toBeNull();
    expect(parseAiMappingResponse('["an","array"]', headers, FIELD_SPECS.bills)).toBeNull();
  });
});

describe("mergeAiProposal — deterministic wins, AI only fills gaps", () => {
  it("never overrides a confident deterministic match", () => {
    const base = { id: "Bill No", vendorId: null, invoiceAcceptanceDate: "Bill Date", amount: null,
      hasWrittenAgreement: null, agreedPaymentDays: null, paidDate: null };
    const ai = { id: "Party", vendorId: "Party", invoiceAcceptanceDate: "Net Amount", amount: "Net Amount",
      hasWrittenAgreement: null, agreedPaymentDays: null, paidDate: null };
    const { mapping, aiFilled } = mergeAiProposal(base, ai, FIELD_SPECS.bills);
    expect(mapping.id).toBe("Bill No"); // AI's "Party" ignored
    expect(mapping.invoiceAcceptanceDate).toBe("Bill Date"); // AI's bad guess ignored
    expect(mapping.vendorId).toBe("Party"); // gap filled by AI
    expect(mapping.amount).toBe("Net Amount"); // gap filled by AI
    expect(aiFilled.sort()).toEqual(["amount", "vendorId"]);
  });

  it("does not let the AI reuse a column already claimed", () => {
    const base = { id: "Party", vendorId: null, invoiceAcceptanceDate: null, amount: null,
      hasWrittenAgreement: null, agreedPaymentDays: null, paidDate: null };
    const ai = { id: null, vendorId: "Party", invoiceAcceptanceDate: null, amount: null,
      hasWrittenAgreement: null, agreedPaymentDays: null, paidDate: null };
    const { mapping, aiFilled } = mergeAiProposal(base, ai, FIELD_SPECS.bills);
    expect(mapping.vendorId).toBeNull(); // "Party" already used by id
    expect(aiFilled).toEqual([]);
  });

  it("is a no-op when there is no AI proposal (no key / call failed)", () => {
    const base = { id: "Bill No", vendorId: null, invoiceAcceptanceDate: null, amount: null,
      hasWrittenAgreement: null, agreedPaymentDays: null, paidDate: null };
    const { mapping, aiFilled } = mergeAiProposal(base, null, FIELD_SPECS.bills);
    expect(mapping).toEqual(base);
    expect(aiFilled).toEqual([]);
  });
});

describe("end-to-end: a messy real-world bill file flows through to valid rows", () => {
  it("auto-maps renamed columns, normalizes values, and passes the existing validator", () => {
    // A file with columns named/ordered nothing like the app's samples, with a
    // day-first date, an Excel-serial date, and rupee-formatted amounts.
    const headers = ["Bill No", "Party", "Bill Date", "Net Amount"];
    const rawRows = [
      { "Bill No": "B-1001", Party: "V1", "Bill Date": "15/06/2026", "Net Amount": "₹1,00,000" },
      { "Bill No": "B-1002", Party: "V2", "Bill Date": "45658", "Net Amount": "2,50,000" },
    ];

    const { mapping } = suggestMapping(headers, FIELD_SPECS.bills);
    expect(mapping.id).toBe("Bill No");
    expect(mapping.vendorId).toBe("Party");
    expect(mapping.invoiceAcceptanceDate).toBe("Bill Date");
    expect(mapping.amount).toBe("Net Amount");

    const canonical = applyMapping(rawRows, mapping, FIELD_SPECS.bills);
    const csv = toCanonicalCsv(canonical, FIELD_SPECS.bills);

    // The existing, unchanged validator accepts the canonical output.
    const parsed = parseBillsCsv(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.valid).toHaveLength(2);
    expect(parsed.valid[0].amount).toBe(100000);
    expect(parsed.valid[0].invoiceAcceptanceDate).toBe("2026-06-15");
    expect(parsed.valid[1].invoiceAcceptanceDate.startsWith("2025")).toBe(true);
  });
});
