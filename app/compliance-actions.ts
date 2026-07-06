"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { rateLimit, retryPhrase } from "@/lib/rate-limit";

const BUCKET = "compliance-proofs";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — matches the bucket's file_size_limit.
const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

export interface ProofResult {
  ok: boolean;
  message: string;
}

/** Storage path for an account's proof of a given deadline. First folder = uid,
 *  which the storage RLS policy checks — so a user can only ever reach their own. */
function proofPath(userId: string, deadlineId: string, ext: string): string {
  return `${userId}/${deadlineId}/proof.${ext}`;
}

export async function uploadComplianceProof(
  _prev: ProofResult | null,
  formData: FormData
): Promise<ProofResult> {
  const user = await requireUser();

  const limited = await rateLimit(`proof:${user.id}`, 30, 600);
  if (!limited.ok) {
    return { ok: false, message: `Too many uploads — try again in ${retryPhrase(limited.retryAfterSeconds)}.` };
  }

  const deadlineId = String(formData.get("deadlineId") ?? "");
  const file = formData.get("file");
  if (!deadlineId) return { ok: false, message: "Missing deadline reference." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "No file selected." };
  if (file.size > MAX_BYTES) return { ok: false, message: "File is too large (max 5 MB)." };
  const ext = EXT[file.type];
  if (!ext) return { ok: false, message: "Only PDF, PNG or JPG files are allowed." };

  // Owner-scoped: the composite key means we only match this user's deadline.
  const row = await db.complianceDeadline.findUnique({
    where: { ownerId_id: { ownerId: user.id, id: deadlineId } },
  });
  if (!row) return { ok: false, message: "That deadline no longer exists." };

  const path = proofPath(user.id, deadlineId, ext);
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return { ok: false, message: "Upload failed — please try again." };

  await db.complianceDeadline.update({
    where: { ownerId_id: { ownerId: user.id, id: deadlineId } },
    data: { proofFilePath: path },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Proof document saved." };
}

/** Short-lived signed URL for the caller's proof file, or null. */
export async function getComplianceProofUrl(deadlineId: string): Promise<string | null> {
  const user = await requireUser();
  const row = await db.complianceDeadline.findUnique({
    where: { ownerId_id: { ownerId: user.id, id: deadlineId } },
  });
  if (!row?.proofFilePath) return null;

  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(row.proofFilePath, 60);
  return data?.signedUrl ?? null;
}

export async function removeComplianceProof(deadlineId: string): Promise<ProofResult> {
  const user = await requireUser();
  const row = await db.complianceDeadline.findUnique({
    where: { ownerId_id: { ownerId: user.id, id: deadlineId } },
  });
  if (!row?.proofFilePath) return { ok: true, message: "No proof to remove." };

  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([row.proofFilePath]);
  await db.complianceDeadline.update({
    where: { ownerId_id: { ownerId: user.id, id: deadlineId } },
    data: { proofFilePath: null },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Proof document removed." };
}
