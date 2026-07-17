"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit, retryPhrase } from "@/lib/rate-limit";
import { todayInBusinessZone } from "@/lib/businessDate";

export type RcmActionResult = { ok: boolean; message: string };

// A reverse-charge purchase carries two independent clocks: the Rule 47A
// self-invoice, and the cash-GST payment. Each can be marked done or undone, and
// the engine re-reads both to recompute the interest + penalty exposure.
function revalidateRcmViews(): void {
  revalidatePath("/rcm");
  revalidatePath("/dashboard");
  revalidatePath("/report");
}

/** Shared owner + rate-limit gate. Returns the user id, or an error result to return as-is. */
async function guard(): Promise<
  { ok: true; userId: string } | { ok: false; result: RcmActionResult }
> {
  const user = await requireUser();
  const limited = await rateLimit(`rcm:${user.id}`, 60, 600);
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

/** Mark the Rule 47A self-invoice issued (or not), owner-scoped. */
export async function setRcmSelfInvoice(
  purchaseId: string,
  issued: boolean
): Promise<RcmActionResult> {
  const g = await guard();
  if (!g.ok) return g.result;
  if (!purchaseId) return { ok: false, message: "Missing purchase reference." };

  try {
    await db.rcmPurchase.update({
      where: { ownerId_id: { ownerId: g.userId, id: purchaseId } },
      data: { selfInvoiceIssued: issued },
    });
  } catch {
    return { ok: false, message: "That purchase no longer exists." };
  }

  revalidateRcmViews();
  return { ok: true, message: issued ? "Self-invoice marked issued." : "Self-invoice marked not issued." };
}

/**
 * Mark the reverse-charge tax paid as of today's Indian business date (or clear
 * it). Paying stops the s.50 interest clock in the engine.
 */
export async function setRcmTaxPaid(
  purchaseId: string,
  paid: boolean
): Promise<RcmActionResult> {
  const g = await guard();
  if (!g.ok) return g.result;
  if (!purchaseId) return { ok: false, message: "Missing purchase reference." };

  try {
    await db.rcmPurchase.update({
      where: { ownerId_id: { ownerId: g.userId, id: purchaseId } },
      data: { rcmTaxPaidDate: paid ? todayInBusinessZone() : null },
    });
  } catch {
    return { ok: false, message: "That purchase no longer exists." };
  }

  revalidateRcmViews();
  return { ok: true, message: paid ? "Reverse-charge tax marked paid." : "Marked unpaid." };
}

/** Delete a reverse-charge purchase (a wrong, duplicate or test row), owner-scoped. */
export async function deleteRcmPurchase(purchaseId: string): Promise<RcmActionResult> {
  const g = await guard();
  if (!g.ok) return g.result;
  if (!purchaseId) return { ok: false, message: "Missing purchase reference." };

  try {
    await db.rcmPurchase.delete({
      where: { ownerId_id: { ownerId: g.userId, id: purchaseId } },
    });
  } catch {
    return { ok: false, message: "That purchase no longer exists." };
  }

  revalidateRcmViews();
  return { ok: true, message: "Purchase deleted." };
}
