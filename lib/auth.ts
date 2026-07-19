import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * The current authenticated user, or null.
 *
 * Wrapped in React's `cache` so it runs ONCE per request. Both the app layout
 * and the page inside it call requireUser(), and getUser() is a network call to
 * Supabase Auth, not a local cookie read: without this every navigation paid for
 * two round-trips to verify the same token.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

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
