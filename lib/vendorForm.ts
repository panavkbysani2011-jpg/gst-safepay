import { z } from "zod";

export const UDYAM_CATEGORIES = ["micro", "small", "medium"] as const;

// Manual add/edit of a vendor. Unlike the CSV importer this does not reject an
// invalid GSTIN — the verification module already flags a bad checksum, and we
// don't want to block someone from saving a vendor while they sort the number
// out. We do require a Udyam category once the supplier is marked registered,
// because the MSME 45-day rule needs it.
export const VendorFormSchema = z
  .object({
    id: z.string().trim().min(1).max(64).optional(),
    name: z.string().trim().min(1, "Business name is required").max(200),
    gstin: z
      .string()
      .trim()
      .min(1, "GSTIN is required")
      .max(20, "GSTIN is too long")
      .transform((s) => s.toUpperCase()),
    gstinActive: z.boolean(),
    udyamRegistered: z.boolean(),
    udyamCategory: z.enum(UDYAM_CATEGORIES).nullable(),
  })
  .refine((v) => !v.udyamRegistered || v.udyamCategory !== null, {
    message: "Pick a category (micro / small / medium) for a Udyam-registered supplier.",
    path: ["udyamCategory"],
  });

export type VendorFormValues = z.infer<typeof VendorFormSchema>;

export type ParseVendorResult =
  | { ok: true; value: VendorFormValues }
  | { ok: false; message: string };

/** Validate already-coerced vendor form values. Returns the first error message on failure. */
export function parseVendorForm(input: unknown): ParseVendorResult {
  const parsed = VendorFormSchema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  const first = parsed.error.issues[0];
  return {
    ok: false,
    message: first?.message ?? "Please check the details and try again.",
  };
}
