import { describe, expect, it } from "vitest";
import {
  parseBillsCsv,
  parseComplianceCsv,
  parseImsCsv,
  parseRcmCsv,
  parseVendorsCsv,
} from "./parseCsv";

describe("parseVendorsCsv", () => {
  it("parses valid vendor rows", () => {
    const csv = [
      "id,name,gstin,gstinActive,udyamRegistered,udyamCategory",
      "v1,Bharath Steel,29ABCDE1234F1Z5,true,true,micro",
      "v2,Apex Supplies,29AAFCA9988J1Z3,true,true,medium",
    ].join("\n");

    const result = parseVendorsCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.valid).toHaveLength(2);
    expect(result.valid[0]).toEqual({
      id: "v1",
      name: "Bharath Steel",
      gstin: "29ABCDE1234F1Z5",
      gstinActive: true,
      udyamRegistered: true,
      udyamCategory: "micro",
    });
  });

  it("accepts common boolean spellings (yes/no, 1/0, TRUE)", () => {
    const csv = [
      "id,name,gstin,gstinActive,udyamRegistered,udyamCategory",
      "v1,A,29ABCDE1234F1Z5,YES,1,small",
      "v2,B,29ABCDE1234F1Z6,no,0,",
    ].join("\n");

    const result = parseVendorsCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.valid[0].gstinActive).toBe(true);
    expect(result.valid[0].udyamRegistered).toBe(true);
    expect(result.valid[1].gstinActive).toBe(false);
    expect(result.valid[1].udyamRegistered).toBe(false);
  });

  it("treats an empty udyamCategory as null", () => {
    const csv = [
      "id,name,gstin,gstinActive,udyamRegistered,udyamCategory",
      "v1,A,29ABCDE1234F1Z5,true,false,",
    ].join("\n");

    const result = parseVendorsCsv(csv);
    expect(result.valid[0].udyamCategory).toBeNull();
  });

  it("reports a row error for an invalid udyamCategory, keeping valid rows", () => {
    const csv = [
      "id,name,gstin,gstinActive,udyamRegistered,udyamCategory",
      "v1,A,29ABCDE1234F1Z5,true,true,micro",
      "v2,B,29ABCDE1234F1Z6,true,true,gigantic",
    ].join("\n");

    const result = parseVendorsCsv(csv);
    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(3);
  });

  it("reports a row error when a required field (name) is blank", () => {
    const csv = [
      "id,name,gstin,gstinActive,udyamRegistered,udyamCategory",
      "v1,,29ABCDE1234F1Z5,true,true,micro",
    ].join("\n");

    const result = parseVendorsCsv(csv);
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });
});

describe("parseBillsCsv", () => {
  it("parses valid bill rows with optional fields", () => {
    const csv = [
      "id,vendorId,invoiceAcceptanceDate,amount,hasWrittenAgreement,agreedPaymentDays,paidDate",
      "b1,v1,2026-06-01,100000,true,45,",
      "b2,v1,2026-04-01,200000,false,,2026-06-01",
    ].join("\n");

    const result = parseBillsCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.valid).toHaveLength(2);
    expect(result.valid[0]).toEqual({
      id: "b1",
      vendorId: "v1",
      invoiceAcceptanceDate: "2026-06-01",
      amount: 100000,
      hasWrittenAgreement: true,
      agreedPaymentDays: 45,
      paidDate: null,
    });
    expect(result.valid[1].agreedPaymentDays).toBeNull();
    expect(result.valid[1].paidDate).toBe("2026-06-01");
  });

  it("reports a row error for a non-numeric amount", () => {
    const csv = [
      "id,vendorId,invoiceAcceptanceDate,amount,hasWrittenAgreement,agreedPaymentDays,paidDate",
      "b1,v1,2026-06-01,not-a-number,true,45,",
    ].join("\n");

    const result = parseBillsCsv(csv);
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it("reports a row error for a malformed date", () => {
    const csv = [
      "id,vendorId,invoiceAcceptanceDate,amount,hasWrittenAgreement,agreedPaymentDays,paidDate",
      "b1,v1,01-06-2026,100000,true,45,",
    ].join("\n");

    const result = parseBillsCsv(csv);
    expect(result.errors).toHaveLength(1);
  });

  it("flags an empty file with a clear message instead of silently importing nothing", () => {
    const result = parseBillsCsv("");
    expect(result.valid).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toMatch(/right file|header/i);
  });
});

describe("parseImsCsv", () => {
  const header =
    "id,vendorId,vendorName,invoiceNo,taxPeriod,taxableValue,gstAmount,imsAction,eligibility";

  it("parses valid IMS invoice rows", () => {
    const csv = [
      header,
      "i1,v1,Bharath Steel,INV-1,2026-06,500000,90000,none,unsure",
      "i2,v2,Apex Supplies,INV-2,2026-05,100000,18000,accept,eligible",
    ].join("\n");

    const result = parseImsCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.valid).toHaveLength(2);
    expect(result.valid[0]).toEqual({
      id: "i1",
      vendorId: "v1",
      vendorName: "Bharath Steel",
      invoiceNo: "INV-1",
      taxPeriod: "2026-06",
      taxableValue: 500000,
      gstAmount: 90000,
      imsAction: "none",
      eligibility: "unsure",
    });
  });

  it("reports a row error for an invalid taxPeriod, keeping valid rows", () => {
    const csv = [
      header,
      "i1,v1,A,INV-1,2026-06,500000,90000,none,unsure",
      "i2,v2,B,INV-2,June-2026,100000,18000,accept,eligible",
    ].join("\n");

    const result = parseImsCsv(csv);
    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(3);
  });

  it("reports a row error for an unknown imsAction", () => {
    const csv = [header, "i1,v1,A,INV-1,2026-06,500000,90000,maybe,unsure"].join(
      "\n"
    );
    const result = parseImsCsv(csv);
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it("reports a row error for a non-numeric gstAmount", () => {
    const csv = [header, "i1,v1,A,INV-1,2026-06,500000,lots,none,unsure"].join(
      "\n"
    );
    const result = parseImsCsv(csv);
    expect(result.errors).toHaveLength(1);
  });
});

describe("parseRcmCsv", () => {
  const header =
    "id,vendorId,vendorName,supplierUnregistered,supplyType,supplyDate,rcmTaxAmount,selfInvoiceIssued,rcmTaxPaidDate";

  it("parses valid RCM rows with boolean coercion and nullable paid date", () => {
    const csv = [
      header,
      "r1,v1,Roadside Transport,yes,goods,2026-05-01,45000,no,",
      "r2,v2,Legal LLP,0,services,2026-06-25,90000,1,2026-07-01",
    ].join("\n");

    const result = parseRcmCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.valid).toHaveLength(2);
    expect(result.valid[0]).toEqual({
      id: "r1",
      vendorId: "v1",
      vendorName: "Roadside Transport",
      supplierUnregistered: true,
      supplyType: "goods",
      supplyDate: "2026-05-01",
      rcmTaxAmount: 45000,
      selfInvoiceIssued: false,
      rcmTaxPaidDate: null,
    });
    expect(result.valid[1].supplierUnregistered).toBe(false);
    expect(result.valid[1].selfInvoiceIssued).toBe(true);
    expect(result.valid[1].rcmTaxPaidDate).toBe("2026-07-01");
  });

  it("reports a row error for an unknown supplyType", () => {
    const csv = [
      header,
      "r1,v1,A,yes,widgets,2026-05-01,45000,no,",
    ].join("\n");
    const result = parseRcmCsv(csv);
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it("reports a row error for a malformed supplyDate", () => {
    const csv = [header, "r1,v1,A,yes,goods,01-05-2026,45000,no,"].join("\n");
    const result = parseRcmCsv(csv);
    expect(result.errors).toHaveLength(1);
  });
});

describe("parseComplianceCsv", () => {
  const header = "id,name,authority,period,dueDate,filedDate,proofRef";

  it("parses valid deadlines incl. nullable filedDate/proofRef", () => {
    const csv = [
      header,
      "c1,GSTR-3B,GST,2026-06,2026-07-20,,",
      "c2,GSTR-3B,GST,2026-05,2026-06-20,2026-06-18,ARN-123",
    ].join("\n");

    const result = parseComplianceCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.valid).toHaveLength(2);
    expect(result.valid[0].filedDate).toBeNull();
    expect(result.valid[0].proofRef).toBeNull();
    expect(result.valid[1].filedDate).toBe("2026-06-18");
    expect(result.valid[1].proofRef).toBe("ARN-123");
  });

  it("reports a row error for a malformed dueDate", () => {
    const csv = [header, "c1,GSTR-3B,GST,2026-06,20-07-2026,,"].join("\n");
    const result = parseComplianceCsv(csv);
    expect(result.errors).toHaveLength(1);
  });
});

describe("import hardening", () => {
  const billHeader =
    "id,vendorId,invoiceAcceptanceDate,amount,hasWrittenAgreement,agreedPaymentDays,paidDate";

  it("rejects a file whose columns don't match this importer, with one clear message", () => {
    const result = parseBillsCsv("foo,bar\n1,2");
    expect(result.valid).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/right file/i);
  });

  it("names the missing column when the header is incomplete", () => {
    // amount column dropped
    const csv = [
      "id,vendorId,invoiceAcceptanceDate,hasWrittenAgreement,agreedPaymentDays,paidDate",
      "b1,v1,2026-06-01,true,45,",
    ].join("\n");
    const result = parseBillsCsv(csv);
    expect(result.valid).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/missing column/i);
    expect(result.errors[0].message).toContain("amount");
  });

  it("does not fire a per-row error storm for a wrong file (one message, not N)", () => {
    const csv = ["foo,bar", "1,2", "3,4", "5,6"].join("\n");
    const result = parseBillsCsv(csv);
    expect(result.errors).toHaveLength(1);
  });

  it("accepts amounts with a rupee sign and Indian thousands commas", () => {
    const csv = [billHeader, 'b1,v1,2026-06-01,"₹1,00,000",true,45,'].join("\n");
    const result = parseBillsCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].amount).toBe(100000);
  });

  it("flags a header-only file as having no data rows", () => {
    const result = parseBillsCsv(billHeader + "\n");
    expect(result.valid).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/no data rows/i);
  });

  it("rejects a file over the row cap instead of processing all of it", () => {
    const rows = Array.from(
      { length: 5001 },
      (_, i) => `b${i},v1,2026-06-01,1000,true,,`
    );
    const result = parseBillsCsv([billHeader, ...rows].join("\n"));
    expect(result.valid).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/limit/i);
  });
});
