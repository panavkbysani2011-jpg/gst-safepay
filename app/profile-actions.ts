"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit, retryPhrase } from "@/lib/rate-limit";
import { BusinessProfileSchema } from "@/lib/businessProfile";

export interface SaveProfileResult {
  ok: boolean;
  message: string;
}

// Save the firm's business details. Untrusted form input is validated by the
// zod schema (GSTIN checksum included) before it ever reaches the database.
export async function saveBusinessProfile(
  _prev: SaveProfileResult | null,
  formData: FormData
): Promise<SaveProfileResult> {
  const user = await requireUser();

  const limited = await rateLimit(`profile:${user.id}`, 30, 600);
  if (!limited.ok) {
    return {
      ok: false,
      message: `Too many changes. Try again in ${retryPhrase(limited.retryAfterSeconds)}.`,
    };
  }

  const parsed = BusinessProfileSchema.safeParse({
    businessName: formData.get("businessName"),
    gstin: formData.get("gstin"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: issue?.message ?? "Please check the details and try again." };
  }

  await db.businessProfile.upsert({
    where: { ownerId: user.id },
    create: { ownerId: user.id, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. Your firm details now appear on the action report." };
}
