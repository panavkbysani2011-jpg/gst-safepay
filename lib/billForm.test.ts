import { describe, it, expect } from "vitest";
import { parseBillForm, billFormFromEntries } from "./billForm";

const valid = {
  vendorId: "v1",
  invoiceAcceptanceDate: "2026-06-15",
  amount: 100000,
  hasWrittenAgreement: true,
  agreedPaymentDays: 45,
  paidDate: null,
};

describe("parseBillForm", () => {
  it("accepts a well-formed bill", () => {
    const r = parseBillForm(valid);
    expect(r.ok).toBe(true);
  });

  it("requires a supplier", () => {
    const r = parseBillForm({ ...valid, vendorId: "" });
    expect(r).toEqual({ ok: false, message: "Choose which supplier this bill is from" });
  });

  it("requires a real bill date", () => {
    const r = parseBillForm({ ...valid, invoiceAcceptanceDate: "15/06/2026" });
    expect(r.ok).toBe(false);
  });

  it("rejects a negative amount", () => {
    const r = parseBillForm({ ...valid, amount: -5 });
    expect(r).toEqual({ ok: false, message: "Amount cannot be negative" });
  });

  it("rejects a paid date before the bill date, which would invert the deadline", () => {
    const r = parseBillForm({ ...valid, paidDate: "2026-06-01" });
    expect(r).toEqual({ ok: false, message: "The paid date cannot be before the bill date" });
  });

  it("accepts a paid date on the bill date", () => {
    expect(parseBillForm({ ...valid, paidDate: "2026-06-15" }).ok).toBe(true);
  });

  it("allows no agreed term (the statutory default then applies)", () => {
    expect(parseBillForm({ ...valid, agreedPaymentDays: null }).ok).toBe(true);
  });

  it("rejects an absurd payment term", () => {
    expect(parseBillForm({ ...valid, agreedPaymentDays: 400 }).ok).toBe(false);
  });
});

describe("billFormFromEntries", () => {
  const form = (o: Record<string, string>) => (k: string) => o[k] ?? null;

  it("strips rupee formatting from the amount", () => {
    const out = billFormFromEntries(
      form({
        vendorId: "v1",
        invoiceAcceptanceDate: "2026-06-15",
        amount: "₹1,00,000",
        hasWrittenAgreement: "on",
      })
    ) as { amount: number; hasWrittenAgreement: boolean };
    expect(out.amount).toBe(100000);
    expect(out.hasWrittenAgreement).toBe(true);
  });

  it("turns blank optional fields into null, not zero", () => {
    const out = billFormFromEntries(
      form({ vendorId: "v1", invoiceAcceptanceDate: "2026-06-15", amount: "500" })
    ) as { agreedPaymentDays: number | null; paidDate: string | null };
    expect(out.agreedPaymentDays).toBeNull();
    expect(out.paidDate).toBeNull();
  });

  it("reports a blank amount as missing rather than silently zero", () => {
    const out = billFormFromEntries(
      form({ vendorId: "v1", invoiceAcceptanceDate: "2026-06-15", amount: "" })
    );
    expect(parseBillForm(out).ok).toBe(false);
  });
});
