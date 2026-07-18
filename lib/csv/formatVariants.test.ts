import { describe, it, expect } from "vitest";
import { FIELD_SPECS, suggestMapping } from "./fieldMapping";

// The promise the import page makes is "any layout works". Different businesses
// export from different software (Tally, Busy, Zoho, Marg, or a hand-made sheet)
// and name the same information completely differently. This pins that promise
// against realistic header rows: for each, the REQUIRED fields must auto-map.
//
// A failure here is a real user hitting "we could not find your amount column".

type Variant = { source: string; headers: string[] };

const BILL_VARIANTS: Variant[] = [
  { source: "Tally (voucher register)", headers: ["Voucher No", "Voucher Date", "Party Ledger", "Amount", "Narration"] },
  { source: "Tally (abbreviated)", headers: ["Vch No.", "Vch Date", "Ledger Name", "Debit Amount"] },
  { source: "Busy", headers: ["Bill No", "Bill Date", "Party Name", "Net Amount"] },
  { source: "Zoho Books (bills)", headers: ["Bill Number", "Bill Date", "Vendor Name", "Total"] },
  { source: "Marg / pharmacy POS", headers: ["BillNo", "BillDate", "Party", "Amount"] },
  { source: "hand-made spreadsheet", headers: ["S.No", "Date", "Supplier", "Value", "Paid On"] },
  { source: "dotted / spaced labels", headers: ["Invoice No.", "Invoice Dt.", "Supplier Name", "Grand Total"] },
  { source: "SCREAMING_SNAKE export", headers: ["INVOICE_NUMBER", "INVOICE_DATE", "VENDOR_NAME", "NET_AMOUNT"] },
  { source: "GST-style purchase register", headers: ["Doc No", "Doc Date", "Supplier GSTIN", "Taxable Value"] },
];

const VENDOR_VARIANTS: Variant[] = [
  { source: "Tally ledger master", headers: ["Ledger Name", "Ledger Code", "GSTIN/UIN"] },
  { source: "Busy master", headers: ["Party Name", "Party Code", "GST No"] },
  { source: "Zoho contacts", headers: ["Company Name", "Contact ID", "GST Treatment", "GSTIN"] },
  { source: "hand-made", headers: ["Supplier", "Code", "GST Number", "MSME Category"] },
];

function mappedRequired(headers: string[], kind: "bills" | "vendors") {
  const fields = FIELD_SPECS[kind];
  const { mapping, unmappedRequired } = suggestMapping(headers, fields);
  return { mapping, unmappedRequired };
}

describe("real-world bill layouts auto-map their required fields", () => {
  for (const v of BILL_VARIANTS) {
    it(`maps: ${v.source}`, () => {
      const { mapping, unmappedRequired } = mappedRequired(v.headers, "bills");
      // Every required field must find a column, or the user is blocked.
      expect(
        unmappedRequired,
        `${v.source} left required fields unmapped. mapping=${JSON.stringify(mapping)}`
      ).toEqual([]);
    });
  }
});

describe("real-world vendor layouts auto-map their required fields", () => {
  for (const v of VENDOR_VARIANTS) {
    it(`maps: ${v.source}`, () => {
      const { mapping, unmappedRequired } = mappedRequired(v.headers, "vendors");
      expect(
        unmappedRequired,
        `${v.source} left required fields unmapped. mapping=${JSON.stringify(mapping)}`
      ).toEqual([]);
    });
  }
});
