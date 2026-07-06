// Business identity — an optional profile (firm name + GSTIN) a user sets once.
// Shown on the printable action report so a CA handout carries the client's name.
// Pure validation lives here; storage + reads are in lib/data/businessProfile.ts.
import { z } from "zod";
import { isValidGstin } from "@/lib/rules/gstin";

export interface BusinessProfile {
  businessName: string | null;
  gstin: string | null;
}

// Trim, and treat a blank field as "not set" (null) rather than an empty string.
function emptyToNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const BusinessProfileSchema = z.object({
  businessName: z.preprocess(
    emptyToNull,
    z.string().max(120, "Keep the business name under 120 characters.").nullable()
  ),
  gstin: z.preprocess(
    (v) => {
      const n = emptyToNull(v);
      return n ? n.toUpperCase() : null;
    },
    z
      .string()
      .nullable()
      .refine((v) => v === null || isValidGstin(v), {
        message: "Enter a valid 15-character GSTIN, or leave it blank.",
      })
  ),
});

export type BusinessProfileInput = z.infer<typeof BusinessProfileSchema>;
