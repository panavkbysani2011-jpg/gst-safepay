import { describe, it, expect } from "vitest";
import { planVendorLinks, type ExistingVendor } from "./vendorLink";
import { parseBillsCsv } from "./parseCsv";
import {
  FIELD_SPECS,
  suggestMapping,
  applyMapping,
  toCanonicalCsv,
} from "./fieldMapping";

const EXISTING: ExistingVendor[] = [
  { id: "v1", name: "Acme Pharma Pvt Ltd", gstin: "29AABCU9603R1ZM" },
  { id: "v2", name: "Zenith Traders", gstin: "27AAECZ1234M1Z9" },
  { id: "SUP-03", name: "Kaveri Distributors", gstin: "" },
];

describe("planVendorLinks — matching an existing vendor", () => {
  it("matches by exact id (files already using our ids keep working)", () => {
    const plan = planVendorLinks([{ vendorId: "v1" }], EXISTING);
    expect(plan.resolved.get("v1")).toBe("v1");
    expect(plan.matchedBy.get("v1")).toBe("id");
    expect(plan.toCreate).toEqual([]);
  });

  it("matches an id case-insensitively", () => {
    const plan = planVendorLinks([{ vendorId: "sup-03" }], EXISTING);
    expect(plan.resolved.get("sup-03")).toBe("SUP-03");
    expect(plan.matchedBy.get("sup-03")).toBe("id");
  });

  it("matches by vendor NAME, which is what real purchase registers carry", () => {
    const plan = planVendorLinks([{ vendorId: "Zenith Traders" }], EXISTING);
    expect(plan.resolved.get("Zenith Traders")).toBe("v2");
    expect(plan.matchedBy.get("Zenith Traders")).toBe("name");
    expect(plan.toCreate).toEqual([]);
  });

  it("matches a name despite case and spacing differences", () => {
    const plan = planVendorLinks([{ vendorId: "  acme   pharma   pvt ltd " }], EXISTING);
    expect(plan.resolved.get("acme   pharma   pvt ltd")).toBe("v1");
  });

  it("matches by GSTIN when the reference is itself a GSTIN", () => {
    const plan = planVendorLinks([{ vendorId: "29AABCU9603R1ZM" }], EXISTING);
    expect(plan.resolved.get("29AABCU9603R1ZM")).toBe("v1");
    expect(plan.matchedBy.get("29AABCU9603R1ZM")).toBe("gstin");
  });

  it("matches by a separately mapped GSTIN column, even if the ref is unknown", () => {
    const plan = planVendorLinks(
      [{ vendorId: "SUPP-999", vendorGstin: "27aaecz1234m1z9" }],
      EXISTING
    );
    expect(plan.resolved.get("SUPP-999")).toBe("v2"); // GSTIN wins over an unknown id
    expect(plan.matchedBy.get("SUPP-999")).toBe("gstin");
    expect(plan.toCreate).toEqual([]);
  });

  it("prefers id over name when both could match", () => {
    const rows = [{ vendorId: "v1", vendorName: "Zenith Traders" }];
    const plan = planVendorLinks(rows, EXISTING);
    expect(plan.resolved.get("v1")).toBe("v1"); // id wins
  });
});

describe("planVendorLinks — seeding unknown vendors instead of dropping the row", () => {
  it("creates a vendor from a bare supplier name (the old silent-skip case)", () => {
    const plan = planVendorLinks([{ vendorId: "ABBOT CCD" }], EXISTING);
    expect(plan.resolved.get("ABBOT CCD")).toBe("ABBOT CCD");
    expect(plan.matchedBy.get("ABBOT CCD")).toBe("created");
    expect(plan.toCreate).toEqual([{ id: "ABBOT CCD", name: "ABBOT CCD", gstin: "" }]);
  });

  it("uses the mapped name and GSTIN columns when seeding", () => {
    const plan = planVendorLinks(
      [{ vendorId: "SUPP-77", vendorName: "New Supplier Co", vendorGstin: "29AAGCK5678L1Z3" }],
      EXISTING
    );
    expect(plan.toCreate).toEqual([
      { id: "SUPP-77", name: "New Supplier Co", gstin: "29AAGCK5678L1Z3" },
    ]);
  });

  it("seeds a GSTIN-shaped reference as the vendor's GSTIN too", () => {
    const plan = planVendorLinks([{ vendorId: "24AAAAA0000A1Z5" }], EXISTING);
    expect(plan.toCreate[0].gstin).toBe("24AAAAA0000A1Z5");
  });

  it("creates ONE vendor per distinct supplier across many rows", () => {
    const rows = [
      { vendorId: "ABBOT CCD" },
      { vendorId: "ABBOT CCD" },
      { vendorId: "ABBOT CCD1" }, // a genuinely different string
      { vendorId: "ABBOT CCD" },
    ];
    const plan = planVendorLinks(rows, EXISTING);
    expect(plan.toCreate.map((v) => v.id).sort()).toEqual(["ABBOT CCD", "ABBOT CCD1"]);
    expect(plan.resolved.get("ABBOT CCD")).toBe("ABBOT CCD");
  });

  it("mixes matches and creates in one file", () => {
    const rows = [
      { vendorId: "v1" }, // existing by id
      { vendorId: "Zenith Traders" }, // existing by name
      { vendorId: "ABBOT CCD" }, // new
    ];
    const plan = planVendorLinks(rows, EXISTING);
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.resolved.size).toBe(3);
  });

  it("ignores blank references", () => {
    const plan = planVendorLinks([{ vendorId: "  " }], EXISTING);
    expect(plan.toCreate).toEqual([]);
    expect(plan.resolved.size).toBe(0);
  });

  it("works from an empty vendor list (bills uploaded first)", () => {
    const plan = planVendorLinks([{ vendorId: "ABBOT CCD" }, { vendorId: "Cipla" }], []);
    expect(plan.toCreate).toHaveLength(2);
    expect(plan.resolved.get("Cipla")).toBe("Cipla");
  });
});

describe("end-to-end: a purchase register that names its suppliers", () => {
  it("imports with ZERO vendors set up (previously every row was skipped)", () => {
    // Columns named nothing like our samples, supplier given by NAME, day-first
    // dates and rupee-formatted amounts: what a real export actually looks like.
    const headers = ["Bill No", "Supplier", "Bill Date", "Net Amount"];
    const rawRows = [
      { "Bill No": "B-1", Supplier: "ABBOT CCD", "Bill Date": "15/06/2026", "Net Amount": "₹1,00,000" },
      { "Bill No": "B-2", Supplier: "ABBOT CCD", "Bill Date": "16/06/2026", "Net Amount": "50,000" },
      { "Bill No": "B-3", Supplier: "Cipla Ltd", "Bill Date": "17/06/2026", "Net Amount": "25,000" },
    ];

    const { mapping } = suggestMapping(headers, FIELD_SPECS.bills);
    expect(mapping.vendorId).toBe("Supplier");

    const csv = toCanonicalCsv(applyMapping(rawRows, mapping, FIELD_SPECS.bills), FIELD_SPECS.bills);
    const parsed = parseBillsCsv(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.valid).toHaveLength(3);

    // The killer case: no vendors exist yet. Old behaviour skipped all 3 rows.
    const plan = planVendorLinks(parsed.valid, []);
    expect(plan.toCreate.map((v) => v.id).sort()).toEqual(["ABBOT CCD", "Cipla Ltd"]);
    // Every bill now resolves to a vendor, so nothing is dropped.
    for (const bill of parsed.valid) {
      expect(plan.resolved.get(bill.vendorId.trim())).toBeTruthy();
    }
    // The two rows sharing a supplier share one vendor.
    expect(plan.resolved.get("ABBOT CCD")).toBe("ABBOT CCD");
  });

  it("links to vendors that already exist instead of duplicating them", () => {
    const existing: ExistingVendor[] = [
      { id: "v1", name: "ABBOT CCD", gstin: "29AABCU9603R1ZM" },
    ];
    const plan = planVendorLinks(
      [{ vendorId: "ABBOT CCD" }, { vendorId: "Cipla Ltd" }],
      existing
    );
    expect(plan.resolved.get("ABBOT CCD")).toBe("v1"); // matched by name
    expect(plan.toCreate.map((v) => v.id)).toEqual(["Cipla Ltd"]); // only the new one
  });
});
