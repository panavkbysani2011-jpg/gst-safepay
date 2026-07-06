import { describe, expect, it } from "vitest";
import { computeGstinChecksum, isValidGstin } from "./gstin";

describe("computeGstinChecksum", () => {
  it("produces the correct check digit for a known GSTIN (27AAPFU0939F1Z -> V)", () => {
    // 27AAPFU0939F1ZV is a widely-published valid GSTIN; the 15th char is the checksum.
    expect(computeGstinChecksum("27AAPFU0939F1Z")).toBe("V");
  });
});

describe("isValidGstin", () => {
  it("accepts a GSTIN whose checksum we computed (round-trip)", () => {
    const first14 = "29AAPFU0939F1Z";
    const gstin = first14 + computeGstinChecksum(first14);
    expect(isValidGstin(gstin)).toBe(true);
  });

  it("accepts the known valid 27AAPFU0939F1ZV", () => {
    expect(isValidGstin("27AAPFU0939F1ZV")).toBe(true);
  });

  it("rejects a GSTIN with a tampered checksum digit", () => {
    const gstin = "27AAPFU0939F1ZV";
    const wrong = gstin.slice(0, 14) + (gstin[14] === "A" ? "B" : "A");
    expect(isValidGstin(wrong)).toBe(false);
  });

  it("rejects the wrong length", () => {
    expect(isValidGstin("27AAPFU0939F1Z")).toBe(false); // 14 chars
    expect(isValidGstin("27AAPFU0939F1ZVX")).toBe(false); // 16 chars
  });

  it("rejects lowercase / malformed structure", () => {
    expect(isValidGstin("27aapfu0939f1zv")).toBe(false);
    expect(isValidGstin("ABAAPFU0939F1ZV")).toBe(false); // state code not digits
    expect(isValidGstin("2712345939F1ZVV")).toBe(false); // PAN block not letters
  });

  it("rejects an empty string", () => {
    expect(isValidGstin("")).toBe(false);
  });

  it("catches a single adjacent transposition (checksum changes)", () => {
    // 27AAPFU0939F1ZV is valid; swapping the P and F flips the check digit.
    expect(isValidGstin("27AAPFU0939F1ZV")).toBe(true);
    expect(isValidGstin("27AAFPU0939F1ZV")).toBe(false);
  });

  it("round-trips a computed checksum across several state codes", () => {
    for (const state of ["01", "07", "27", "29", "36"]) {
      const first14 = `${state}AAPFU0939F1Z`;
      const gstin = first14 + computeGstinChecksum(first14);
      expect(isValidGstin(gstin)).toBe(true);
    }
  });

  it("rejects a GSTIN whose 14th character isn't the mandatory 'Z'", () => {
    expect(isValidGstin("27AAPFU0939F1YV")).toBe(false);
  });

  it("returns '?' when a non-base36 character can't be scored", () => {
    expect(computeGstinChecksum("27AAPFU0939F1-")).toBe("?");
  });
});
