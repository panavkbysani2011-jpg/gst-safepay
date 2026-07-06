"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// DPDP right-to-erasure: permanently delete the account and everything we hold.
export async function deleteAccount() {
  const user = await requireUser();
  const supabase = await createClient();

  // 0. Purge uploaded proof files from Storage while the session is still valid
  //    (storage RLS is keyed to auth.uid()). Gather paths before the rows go.
  const proofs = await db.complianceDeadline.findMany({
    where: { ownerId: user.id, NOT: { proofFilePath: null } },
    select: { proofFilePath: true },
  });
  const proofPaths = proofs
    .map((p) => p.proofFilePath)
    .filter((p): p is string => p !== null);
  if (proofPaths.length > 0) {
    try {
      await supabase.storage.from("compliance-proofs").remove(proofPaths);
    } catch {
      // Best effort — DB erasure below is the record of truth.
    }
  }

  // 1. Erase all business/personal data (owner-scoped).
  await db.bill.deleteMany({ where: { ownerId: user.id } });
  await db.vendor.deleteMany({ where: { ownerId: user.id } });
  await db.imsInvoice.deleteMany({ where: { ownerId: user.id } });
  await db.rcmPurchase.deleteMany({ where: { ownerId: user.id } });
  await db.complianceDeadline.deleteMany({ where: { ownerId: user.id } });
  await db.ruleConfig.deleteMany({ where: { ownerId: user.id } });
  await db.businessProfile.deleteMany({ where: { ownerId: user.id } });

  // 2. Delete the auth account itself. Prisma connects as postgres, and every FK
  //    referencing auth.users is ON DELETE CASCADE, so sessions/identities/tokens
  //    for this user are removed too.
  // id is a uuid column; user.id arrives as text, so cast the parameter.
  await db.$executeRawUnsafe(`DELETE FROM auth.users WHERE id = $1::uuid`, user.id);

  // 3. Clear the now-invalid session cookie (best effort) and confirm on /login.
  try {
    await supabase.auth.signOut();
  } catch {
    // The user no longer exists; the cookie is already invalid.
  }

  revalidatePath("/", "layout");
  redirect(
    `/login?${new URLSearchParams({
      notice: "Your account and all your data have been permanently deleted.",
    }).toString()}`
  );
}
