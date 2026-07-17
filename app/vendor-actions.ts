"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit, retryPhrase } from "@/lib/rate-limit";
import { parseVendorForm } from "@/lib/vendorForm";

export type VendorActionResult = { ok: boolean; message: string };

function revalidateVendorViews(): void {
  revalidatePath("/vendors");
  revalidatePath("/dashboard");
  // Deleting/editing a vendor can affect the bills linked to it.
  revalidatePath("/payments");
}

/** Create (blank id) or update (existing id) a vendor, owner-scoped + validated. */
export async function saveVendor(
  _prev: VendorActionResult | null,
  formData: FormData
): Promise<VendorActionResult> {
  const user = await requireUser();
  const limited = await rateLimit(`vendor:${user.id}`, 60, 600);
  if (!limited.ok) {
    return { ok: false, message: `Too many changes. Try again in ${retryPhrase(limited.retryAfterSeconds)}.` };
  }

  const rawId = String(formData.get("id") ?? "").trim();
  const rawCategory = String(formData.get("udyamCategory") ?? "");
  const parsed = parseVendorForm({
    id: rawId === "" ? undefined : rawId,
    name: String(formData.get("name") ?? ""),
    gstin: String(formData.get("gstin") ?? ""),
    gstinActive: formData.get("gstinActive") === "on",
    udyamRegistered: formData.get("udyamRegistered") === "on",
    udyamCategory: rawCategory === "" ? null : rawCategory,
  });
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const v = parsed.value;

  const id = v.id ?? crypto.randomUUID();
  const fields = {
    name: v.name,
    gstin: v.gstin,
    gstinActive: v.gstinActive,
    udyamRegistered: v.udyamRegistered,
    udyamCategory: v.udyamCategory,
  };
  await db.vendor.upsert({
    where: { ownerId_id: { ownerId: user.id, id } },
    create: { ownerId: user.id, id, ...fields },
    update: fields,
  });

  revalidateVendorViews();
  return { ok: true, message: v.id ? "Vendor updated." : "Vendor added." };
}

/** Delete a vendor (and, by the schema's cascade, its bills), owner-scoped. */
export async function deleteVendor(id: string): Promise<VendorActionResult> {
  const user = await requireUser();
  const limited = await rateLimit(`vendor:${user.id}`, 60, 600);
  if (!limited.ok) {
    return { ok: false, message: `Too many changes. Try again in ${retryPhrase(limited.retryAfterSeconds)}.` };
  }
  if (!id) return { ok: false, message: "Missing vendor reference." };

  try {
    await db.vendor.delete({ where: { ownerId_id: { ownerId: user.id, id } } });
  } catch {
    return { ok: false, message: "That vendor no longer exists." };
  }

  revalidateVendorViews();
  return { ok: true, message: "Vendor deleted." };
}
