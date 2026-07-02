import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Returns the current authenticated user, or null. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns the current user, or redirects to /login. Call this at the top of any
 * server component / server action that touches user-scoped data — it is the
 * enforcement point for tenant isolation (the proxy is only an optimistic gate).
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
