import { isValidGstin } from "./gstin";
import type {
  Vendor,
  VendorVerificationAssessment,
  VendorVerificationConfig,
  VendorVerificationStatus,
  VendorVerificationSummary,
} from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return Math.round((to - from) / MS_PER_DAY);
}

export function assessVendorVerification(
  vendor: Vendor,
  asOfDate: string,
  config: VendorVerificationConfig
): VendorVerificationAssessment {
  const gstinValid = isValidGstin(vendor.gstin);
  const lastVerifiedDate = vendor.lastVerifiedDate ?? null;
  const daysSinceVerified =
    lastVerifiedDate === null ? null : daysBetween(lastVerifiedDate, asOfDate);

  let status: VendorVerificationStatus;
  if (!gstinValid) {
    status = "invalid-gstin";
  } else if (lastVerifiedDate === null) {
    status = "never-verified";
  } else if (daysSinceVerified! > config.recheckCadenceDays) {
    status = "recheck-due";
  } else {
    status = "verified";
  }

  return { vendorId: vendor.id, gstinValid, status, lastVerifiedDate, daysSinceVerified };
}

export function summarizeVendorVerification(
  vendors: Vendor[],
  asOfDate: string,
  config: VendorVerificationConfig
): VendorVerificationSummary {
  const assessments = vendors.map((v) =>
    assessVendorVerification(v, asOfDate, config)
  );
  const count = (s: VendorVerificationStatus) =>
    assessments.filter((a) => a.status === s).length;

  const verifiedCount = count("verified");
  return {
    total: assessments.length,
    verifiedCount,
    recheckDueCount: count("recheck-due"),
    neverVerifiedCount: count("never-verified"),
    invalidCount: count("invalid-gstin"),
    needsAttentionCount: assessments.length - verifiedCount,
  };
}
