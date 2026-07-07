import { describe, expect, it } from "vitest";
import { parseVendorForm } from "./vendorForm";

const base = {
  name: "Acme Traders",
  gstin: "29ABCDE1234F1Z5",
  gstinActive: true,
  udyamRegistered: false,
  udyamCategory: null,
};

describe("parseVendorForm", () => {
  it("accepts a valid vendor and uppercases + trims the GSTIN", () => {
    const r = parseVendorForm({ ...base, gstin: "  29abcde1234f1z5  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.gstin).toBe("29ABCDE1234F1Z5");
  });

  it("rejects a blank business name", () => {
    const r = parseVendorForm({ ...base, name: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/name/i);
  });

  it("rejects a blank GSTIN", () => {
    const r = parseVendorForm({ ...base, gstin: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/gstin/i);
  });

  it("requires a category once the supplier is Udyam-registered", () => {
    const r = parseVendorForm({ ...base, udyamRegistered: true, udyamCategory: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/category/i);
  });

  it("accepts a registered supplier with a category", () => {
    const r = parseVendorForm({ ...base, udyamRegistered: true, udyamCategory: "micro" });
    expect(r.ok).toBe(true);
  });

  it("accepts an unregistered supplier with no category", () => {
    expect(parseVendorForm(base).ok).toBe(true);
  });

  it("rejects an unknown category", () => {
    const r = parseVendorForm({ ...base, udyamCategory: "gigantic" });
    expect(r.ok).toBe(false);
  });

  it("keeps the id when editing an existing vendor", () => {
    const r = parseVendorForm({ ...base, id: "v1" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.id).toBe("v1");
  });
});
