import { describe, expect, it } from "vitest";
import {
  checkBillsHealth,
  checkComplianceHealth,
  checkImsHealth,
  checkRcmHealth,
  checkVendorsHealth,
} from "./dataHealth";
import type {
  BillInput,
  ComplianceDeadlineInput,
  ImsInvoiceInput,
  RcmPurchaseInput,
  VendorInput,
} from "./parseCsv";

const ASOF = "2026-07-04";

function vendor(o: Partial<VendorInput> = {}): VendorInput {
  return {
    id: "v1",
    name: "Acme",
    gstin: "27AAPFU0939F1ZV",
    gstinActive: true,
    udyamRegistered: false,
    udyamCategory: null,
    ...o,
  };
}
function bill(o: Partial<BillInput> = {}): BillInput {
  return {
    id: "b1",
    vendorId: "v1",
    invoiceAcceptanceDate: "2026-06-01",
    amount: 100000,
    hasWrittenAgreement: true,
    agreedPaymentDays: 45,
    paidDate: null,
    ...o,
  };
}

describe("checkVendorsHealth", () => {
  it("passes a clean vendor with a valid GSTIN", () => {
    // 29AACCB1234F1Z5 is checksum-valid; no warnings expected.
    expect(checkVendorsHealth([vendor()])).toEqual([]);
  });

  it("flags an invalid GSTIN checksum", () => {
    const w = checkVendorsHealth([vendor({ gstin: "27AAPFU0939F1ZX" })]);
    expect(w).toHaveLength(1);
    expect(w[0].message).toMatch(/checksum/i);
  });

  it("flags MSME-registered with no category", () => {
    const w = checkVendorsHealth([
      vendor({ udyamRegistered: true, udyamCategory: null }),
    ]);
    expect(w.some((x) => /category/i.test(x.message))).toBe(true);
  });

  it("flags duplicate ids", () => {
    const w = checkVendorsHealth([vendor({ id: "dup" }), vendor({ id: "dup" })]);
    expect(w.some((x) => /duplicate/i.test(x.message))).toBe(true);
  });
});

describe("checkBillsHealth", () => {
  it("passes a clean bill", () => {
    expect(checkBillsHealth([bill()], ASOF)).toEqual([]);
  });

  it("flags a zero/negative amount", () => {
    expect(checkBillsHealth([bill({ amount: 0 })], ASOF)).toHaveLength(1);
  });

  it("flags an absurdly large amount (extra zeros)", () => {
    const w = checkBillsHealth([bill({ amount: 3_400_000_000 })], ASOF);
    expect(w[0].message).toMatch(/unusually large/i);
  });

  it("flags a future invoice date", () => {
    const w = checkBillsHealth([bill({ invoiceAcceptanceDate: "2027-01-01" })], ASOF);
    expect(w.some((x) => /future/i.test(x.message))).toBe(true);
  });

  it("flags paid-before-billed", () => {
    const w = checkBillsHealth(
      [bill({ invoiceAcceptanceDate: "2026-06-01", paidDate: "2026-05-01" })],
      ASOF
    );
    expect(w.some((x) => /before the invoice/i.test(x.message))).toBe(true);
  });

  it("flags an out-of-range payment term", () => {
    expect(checkBillsHealth([bill({ agreedPaymentDays: 900 })], ASOF)).toHaveLength(1);
  });
});

describe("checkImsHealth", () => {
  function ims(o: Partial<ImsInvoiceInput> = {}): ImsInvoiceInput {
    return {
      id: "i1",
      vendorId: "v1",
      vendorName: "Acme",
      invoiceNo: "INV-1",
      taxPeriod: "2026-06",
      taxableValue: 100000,
      gstAmount: 18000,
      imsAction: "pending",
      eligibility: "eligible",
      ...o,
    };
  }
  it("passes clean IMS rows", () => {
    expect(checkImsHealth([ims()])).toEqual([]);
  });
  it("flags GST exceeding taxable value", () => {
    const w = checkImsHealth([ims({ taxableValue: 1000, gstAmount: 5000 })]);
    expect(w.some((x) => /exceeds the taxable/i.test(x.message))).toBe(true);
  });
});

describe("checkRcmHealth", () => {
  function rcm(o: Partial<RcmPurchaseInput> = {}): RcmPurchaseInput {
    return {
      id: "r1",
      vendorId: "v1",
      vendorName: "Unregistered Traders",
      supplierUnregistered: true,
      supplyType: "goods",
      supplyDate: "2026-06-01",
      rcmTaxAmount: 9000,
      selfInvoiceIssued: false,
      rcmTaxPaidDate: null,
      ...o,
    };
  }
  it("passes clean RCM rows", () => {
    expect(checkRcmHealth([rcm()], ASOF)).toEqual([]);
  });
  it("flags a future supply date", () => {
    expect(checkRcmHealth([rcm({ supplyDate: "2027-02-01" })], ASOF)).toHaveLength(1);
  });
});

describe("checkComplianceHealth", () => {
  function dl(o: Partial<ComplianceDeadlineInput> = {}): ComplianceDeadlineInput {
    return {
      id: "c1",
      name: "GSTR-3B",
      authority: "GST",
      period: "2026-06",
      dueDate: "2026-07-20",
      filedDate: null,
      proofRef: null,
      ...o,
    };
  }
  it("passes clean rows and allows future due dates", () => {
    expect(checkComplianceHealth([dl()], ASOF)).toEqual([]);
  });
  it("flags a future filed date", () => {
    const w = checkComplianceHealth([dl({ filedDate: "2027-01-01" })], ASOF);
    expect(w.some((x) => /future/i.test(x.message))).toBe(true);
  });
});
