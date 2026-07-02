import { describe, expect, it } from "vitest";
import { parseBillsCsv, parseVendorsCsv } from "./parseCsv";

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

  it("returns empty results for an empty file", () => {
    const result = parseBillsCsv("");
    expect(result.valid).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
