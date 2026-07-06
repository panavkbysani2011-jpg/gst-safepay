import { describe, expect, it } from "vitest";
import {
  assessVendorVerification,
  summarizeVendorVerification,
} from "./vendorVerification";
import {
  DEFAULT_VENDOR_VERIFICATION_CONFIG,
  type Vendor,
} from "./types";

const ASOF = "2026-07-15";
const VALID_GSTIN = "27AAPFU0939F1ZV"; // checksum-valid
const BAD_GSTIN = "27AAPFU0939F1ZA"; // wrong checksum

function vendor(overrides: Partial<Vendor> = {}): Vendor {
  return {
    id: "v1",
    name: "Test Vendor",
    gstin: VALID_GSTIN,
    gstinActive: true,
    udyamRegistered: true,
    udyamCategory: "micro",
    lastVerifiedDate: "2026-06-01",
    ...overrides,
  };
}

describe("assessVendorVerification", () => {
  it("marks a valid GSTIN checked recently as 'verified'", () => {
    const r = assessVendorVerification(vendor(), ASOF, DEFAULT_VENDOR_VERIFICATION_CONFIG);
    expect(r.gstinValid).toBe(true);
    expect(r.status).toBe("verified");
    expect(r.daysSinceVerified).toBe(44);
  });

  it("marks a valid GSTIN not checked within the cadence as 'recheck-due'", () => {
    const r = assessVendorVerification(
      vendor({ lastVerifiedDate: "2025-12-01" }),
      ASOF,
      DEFAULT_VENDOR_VERIFICATION_CONFIG
    );
    // ~226 days > 180-day cadence
    expect(r.status).toBe("recheck-due");
  });

  it("marks a never-checked vendor 'never-verified'", () => {
    const r = assessVendorVerification(
      vendor({ lastVerifiedDate: null }),
      ASOF,
      DEFAULT_VENDOR_VERIFICATION_CONFIG
    );
    expect(r.status).toBe("never-verified");
    expect(r.daysSinceVerified).toBeNull();
  });

  it("marks a structurally-invalid GSTIN 'invalid-gstin' regardless of when it was checked", () => {
    const r = assessVendorVerification(
      vendor({ gstin: BAD_GSTIN, lastVerifiedDate: "2026-07-14" }),
      ASOF,
      DEFAULT_VENDOR_VERIFICATION_CONFIG
    );
    expect(r.gstinValid).toBe(false);
    expect(r.status).toBe("invalid-gstin");
  });
});

describe("summarizeVendorVerification", () => {
  it("counts each status across vendors", () => {
    const vendors: Vendor[] = [
      vendor({ id: "a" }), // verified
      vendor({ id: "b", lastVerifiedDate: "2025-01-01" }), // recheck-due
      vendor({ id: "c", lastVerifiedDate: null }), // never
      vendor({ id: "d", gstin: BAD_GSTIN }), // invalid
    ];
    const s = summarizeVendorVerification(vendors, ASOF, DEFAULT_VENDOR_VERIFICATION_CONFIG);
    expect(s.total).toBe(4);
    expect(s.verifiedCount).toBe(1);
    expect(s.recheckDueCount).toBe(1);
    expect(s.neverVerifiedCount).toBe(1);
    expect(s.invalidCount).toBe(1);
    expect(s.needsAttentionCount).toBe(3); // recheck-due + never + invalid
  });
});

describe("assessVendorVerification — cadence boundary and overrides", () => {
  // ASOF 2026-07-15; default cadence = 180 days.
  it("is 'verified' at exactly the cadence and 'recheck-due' one day past it", () => {
    // 2026-01-16 is exactly 180 days before ASOF
    const atEdge = assessVendorVerification(
      vendor({ lastVerifiedDate: "2026-01-16" }),
      ASOF,
      DEFAULT_VENDOR_VERIFICATION_CONFIG
    );
    expect(atEdge.daysSinceVerified).toBe(180);
    expect(atEdge.status).toBe("verified");

    const pastEdge = assessVendorVerification(
      vendor({ lastVerifiedDate: "2026-01-15" }),
      ASOF,
      DEFAULT_VENDOR_VERIFICATION_CONFIG
    );
    expect(pastEdge.daysSinceVerified).toBe(181);
    expect(pastEdge.status).toBe("recheck-due");
  });

  it("respects a CA-configured re-check cadence", () => {
    const cfg = { recheckCadenceDays: 90 };
    // 2026-03-17 is 120 days before ASOF -> recheck-due under a 90-day cadence
    const r = assessVendorVerification(
      vendor({ lastVerifiedDate: "2026-03-17" }),
      ASOF,
      cfg
    );
    expect(r.daysSinceVerified).toBe(120);
    expect(r.status).toBe("recheck-due");
  });

  it("summarizes an empty vendor list to zeros", () => {
    const s = summarizeVendorVerification(
      [],
      ASOF,
      DEFAULT_VENDOR_VERIFICATION_CONFIG
    );
    expect(s.total).toBe(0);
    expect(s.needsAttentionCount).toBe(0);
  });
});
