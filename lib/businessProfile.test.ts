import { describe, it, expect } from "vitest";
import { BusinessProfileSchema } from "./businessProfile";
import { computeGstinChecksum } from "@/lib/rules/gstin";

// Build a checksum-valid GSTIN from a well-formed first 14 chars so the test
// doesn't depend on a hand-picked example matching the validator.
const FIRST14 = "27AAPFU0939F1Z";
const VALID_GSTIN = FIRST14 + computeGstinChecksum(FIRST14);

describe("BusinessProfileSchema", () => {
  it("accepts empty strings as null", () => {
    const r = BusinessProfileSchema.safeParse({ businessName: "", gstin: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual({ businessName: null, gstin: null });
  });

  it("treats missing fields as null", () => {
    const r = BusinessProfileSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual({ businessName: null, gstin: null });
  });

  it("trims and keeps a business name", () => {
    const r = BusinessProfileSchema.safeParse({ businessName: "  Acme Traders  ", gstin: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.businessName).toBe("Acme Traders");
  });

  it("accepts and upper-cases a valid GSTIN", () => {
    const r = BusinessProfileSchema.safeParse({ businessName: "", gstin: VALID_GSTIN.toLowerCase() });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.gstin).toBe(VALID_GSTIN);
  });

  it("rejects a malformed GSTIN", () => {
    const r = BusinessProfileSchema.safeParse({ businessName: "", gstin: "NOTAGSTIN" });
    expect(r.success).toBe(false);
  });

  it("rejects a well-formed GSTIN with a bad checksum", () => {
    const wrong = VALID_GSTIN[14] === "A" ? "B" : "A";
    const r = BusinessProfileSchema.safeParse({ businessName: "", gstin: FIRST14 + wrong });
    expect(r.success).toBe(false);
  });

  it("rejects an over-long business name", () => {
    const r = BusinessProfileSchema.safeParse({ businessName: "x".repeat(121), gstin: "" });
    expect(r.success).toBe(false);
  });
});
