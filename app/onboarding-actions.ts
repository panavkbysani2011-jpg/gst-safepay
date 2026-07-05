"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { GETTING_STARTED_DISMISS_COOKIE } from "@/lib/onboarding";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Hide the "Get set up" checklist for this browser. It is a UI nudge, not
// account data, so a cookie is the right store (no schema change). Server-set
// and server-read, so the Overview never flashes the card for a user who has
// already dismissed it.
export async function dismissGettingStarted(): Promise<void> {
  await requireUser();
  const jar = await cookies();
  jar.set(GETTING_STARTED_DISMISS_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  revalidatePath("/dashboard");
}
