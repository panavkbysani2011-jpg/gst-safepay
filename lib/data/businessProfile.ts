import { cache } from "react";
import { db } from "@/lib/db";
import type { BusinessProfile } from "@/lib/businessProfile";

// The owner's saved firm identity, or nulls if never set. Memoised per request
// so the Settings form and the report header share one read.
export const getBusinessProfile = cache(
  async (ownerId: string): Promise<BusinessProfile> => {
    const row = await db.businessProfile.findUnique({ where: { ownerId } });
    return {
      businessName: row?.businessName ?? null,
      gstin: row?.gstin ?? null,
    };
  }
);
