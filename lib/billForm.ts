import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Manual add/edit of a bill. This is the correction path: an imported bill with
// a wrong amount or date had to be deleted and re-imported before this existed.
// Validation is deliberately strict about the two fields the money math depends
// on (the date and the amount), because a typo here moves a real deadline.
export const BillFormSchema = z
  .object({
    id: z.string().trim().min(1).max(64).optional(),
    vendorId: z
      .string()
      .trim()
      .min(1, "Choose which supplier this bill is from")
      .max(64),
    invoiceAcceptanceDate: z
      .string()
      .trim()
      .regex(ISO_DATE, "Enter the bill date"),
    amount: z
      .number({ message: "Enter the bill amount" })
      .finite("Enter the bill amount")
      .nonnegative("Amount cannot be negative"),
    hasWrittenAgreement: z.boolean(),
    agreedPaymentDays: z
      .number()
      .int("Payment term must be a whole number of days")
      .min(0, "Payment term cannot be negative")
      .max(365, "Payment term cannot be more than a year")
      .nullable(),
    paidDate: z.string().trim().regex(ISO_DATE, "Enter a valid paid date").nullable(),
  })
  .refine((v) => v.paidDate === null || v.paidDate >= v.invoiceAcceptanceDate, {
    message: "The paid date cannot be before the bill date",
    path: ["paidDate"],
  });

export type BillFormValues = z.infer<typeof BillFormSchema>;

export type ParseBillResult =
  | { ok: true; value: BillFormValues }
  | { ok: false; message: string };

/** Validate already-coerced bill form values. Returns the first error message on failure. */
export function parseBillForm(input: unknown): ParseBillResult {
  const parsed = BillFormSchema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  const first = parsed.error.issues[0];
  return {
    ok: false,
    message: first?.message ?? "Please check the details and try again.",
  };
}

/** Coerce a form's raw string fields into the shapes the schema expects. */
export function billFormFromEntries(get: (k: string) => string | null): unknown {
  const days = (get("agreedPaymentDays") ?? "").trim();
  const paid = (get("paidDate") ?? "").trim();
  const rawId = (get("id") ?? "").trim();
  const amount = (get("amount") ?? "").trim();
  return {
    id: rawId === "" ? undefined : rawId,
    vendorId: get("vendorId") ?? "",
    invoiceAcceptanceDate: get("invoiceAcceptanceDate") ?? "",
    // Empty stays NaN so the schema reports "enter the amount" rather than 0.
    amount: amount === "" ? Number.NaN : Number(amount.replace(/[₹,\s]/gu, "")),
    hasWrittenAgreement: get("hasWrittenAgreement") === "on",
    agreedPaymentDays: days === "" ? null : Number(days),
    paidDate: paid === "" ? null : paid,
  };
}
