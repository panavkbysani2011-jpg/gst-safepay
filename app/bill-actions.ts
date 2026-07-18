"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit, retryPhrase } from "@/lib/rate-limit";
import { todayInBusinessZone } from "@/lib/businessDate";
import { parseBillForm, billFormFromEntries } from "@/lib/billForm";

export type BillActionResult = { ok: boolean; message: string };

// A bill drives the Payments ranking, the Overview total, the deadline timeline
// and the report, so any change to one has to refresh all of them.
function revalidateBillViews(): void {
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath("/report");
}

/** Shared owner + rate-limit gate. Returns the user, or an error result to return as-is. */
async function guard(): Promise<
  { ok: true; userId: string } | { ok: false; result: BillActionResult }
> {
  const user = await requireUser();
  const limited = await rateLimit(`bill:${user.id}`, 60, 600);
  if (!limited.ok) {
    return {
      ok: false,
      result: {
        ok: false,
        message: `Too many changes. Try again in ${retryPhrase(limited.retryAfterSeconds)}.`,
      },
    };
  }
  return { ok: true, userId: user.id };
}

/**
 * Create or update a bill, owner-scoped and validated. This is the correction
 * path: before it existed, a bill imported with a wrong amount or date had to be
 * deleted and re-imported. The supplier is re-checked against the caller's own
 * vendor list, so a tampered form cannot attach a bill to someone else's vendor.
 */
export async function saveBill(
  _prev: BillActionResult | null,
  formData: FormData
): Promise<BillActionResult> {
  const g = await guard();
  if (!g.ok) return g.result;

  const parsed = parseBillForm(
    billFormFromEntries((k) => {
      const v = formData.get(k);
      return typeof v === "string" ? v : null;
    })
  );
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const v = parsed.value;

  // Authorization: the vendor must belong to this owner.
  const vendor = await db.vendor.findUnique({
    where: { ownerId_id: { ownerId: g.userId, id: v.vendorId } },
  });
  if (!vendor) return { ok: false, message: "That supplier is not in your vendor list." };

  const id = v.id ?? crypto.randomUUID();
  const fields = {
    vendorId: v.vendorId,
    invoiceAcceptanceDate: v.invoiceAcceptanceDate,
    amount: v.amount,
    hasWrittenAgreement: v.hasWrittenAgreement,
    agreedPaymentDays: v.agreedPaymentDays,
    paidDate: v.paidDate,
  };
  await db.bill.upsert({
    where: { ownerId_id: { ownerId: g.userId, id } },
    create: { ownerId: g.userId, id, ...fields },
    update: fields,
  });

  revalidateBillViews();
  return { ok: true, message: v.id ? "Bill updated." : "Bill added." };
}

/**
 * Mark a bill paid as of today (Indian business date). This is the core loop of
 * the Payments module: you pay a vendor, mark it here, and the rule engine
 * recomputes it as paid-on-time or paid-late, dropping it out of the "who to pay
 * first" queue. The date is the statutory business day, not the server's, so it
 * lands correctly against the deadline even in the early-morning IST window.
 */
export async function markBillPaid(billId: string): Promise<BillActionResult> {
  const g = await guard();
  if (!g.ok) return g.result;
  if (!billId) return { ok: false, message: "Missing bill reference." };

  try {
    await db.bill.update({
      where: { ownerId_id: { ownerId: g.userId, id: billId } },
      data: { paidDate: todayInBusinessZone() },
    });
  } catch {
    return { ok: false, message: "That bill no longer exists." };
  }

  revalidateBillViews();
  return { ok: true, message: "Marked paid." };
}

/** Undo a paid mark (clears the paid date), owner-scoped. For correcting a mistake. */
export async function markBillUnpaid(billId: string): Promise<BillActionResult> {
  const g = await guard();
  if (!g.ok) return g.result;
  if (!billId) return { ok: false, message: "Missing bill reference." };

  try {
    await db.bill.update({
      where: { ownerId_id: { ownerId: g.userId, id: billId } },
      data: { paidDate: null },
    });
  } catch {
    return { ok: false, message: "That bill no longer exists." };
  }

  revalidateBillViews();
  return { ok: true, message: "Marked unpaid." };
}

/** Delete a bill (a wrong, duplicate or test row), owner-scoped. */
export async function deleteBill(billId: string): Promise<BillActionResult> {
  const g = await guard();
  if (!g.ok) return g.result;
  if (!billId) return { ok: false, message: "Missing bill reference." };

  try {
    await db.bill.delete({
      where: { ownerId_id: { ownerId: g.userId, id: billId } },
    });
  } catch {
    return { ok: false, message: "That bill no longer exists." };
  }

  revalidateBillViews();
  return { ok: true, message: "Bill deleted." };
}
