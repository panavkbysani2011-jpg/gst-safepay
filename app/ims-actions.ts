"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit, retryPhrase } from "@/lib/rate-limit";

export type ImsActionResult = { ok: boolean; message: string };

// The user's decision on a supplier invoice in the IMS. Accepting or rejecting
// both stop the deemed-accept clock; "pending" un-actions it again. The engine
// re-reads this to recompute the ITC at risk.
const IMS_CHOICES = ["accept", "reject", "pending"] as const;
export type ImsChoice = (typeof IMS_CHOICES)[number];

const PAST_TENSE: Record<ImsChoice, string> = {
  accept: "accepted",
  reject: "rejected",
  pending: "set to pending",
};

// An IMS decision changes the ITC-at-risk total, so refresh every view that
// shows it: the module, the dashboard overview + timeline, and the report.
function revalidateImsViews(): void {
  revalidatePath("/ims");
  revalidatePath("/dashboard");
  revalidatePath("/report");
}

/** Shared owner + rate-limit gate. Returns the user id, or an error result to return as-is. */
async function guard(): Promise<
  { ok: true; userId: string } | { ok: false; result: ImsActionResult }
> {
  const user = await requireUser();
  const limited = await rateLimit(`ims:${user.id}`, 60, 600);
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

/** Record accept / reject / pending on a supplier invoice, owner-scoped + validated. */
export async function setImsAction(
  invoiceId: string,
  action: ImsChoice
): Promise<ImsActionResult> {
  const g = await guard();
  if (!g.ok) return g.result;
  if (!invoiceId) return { ok: false, message: "Missing invoice reference." };
  if (!IMS_CHOICES.includes(action)) return { ok: false, message: "Unknown action." };

  try {
    await db.imsInvoice.update({
      where: { ownerId_id: { ownerId: g.userId, id: invoiceId } },
      data: { imsAction: action },
    });
  } catch {
    return { ok: false, message: "That invoice no longer exists." };
  }

  revalidateImsViews();
  return { ok: true, message: `Marked ${PAST_TENSE[action]}.` };
}

/** Delete a supplier invoice (a wrong, duplicate or test row), owner-scoped. */
export async function deleteImsInvoice(invoiceId: string): Promise<ImsActionResult> {
  const g = await guard();
  if (!g.ok) return g.result;
  if (!invoiceId) return { ok: false, message: "Missing invoice reference." };

  try {
    await db.imsInvoice.delete({
      where: { ownerId_id: { ownerId: g.userId, id: invoiceId } },
    });
  } catch {
    return { ok: false, message: "That invoice no longer exists." };
  }

  revalidateImsViews();
  return { ok: true, message: "Invoice deleted." };
}
