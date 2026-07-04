"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clientIp, rateLimit, retryPhrase } from "@/lib/rate-limit";

function loginUrl(params: Record<string, string>): string {
  return `/login?${new URLSearchParams(params).toString()}`;
}

// Origin of the current request, for building absolute email-redirect URLs.
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function login(formData: FormData) {
  const ip = await clientIp();
  const limited = await rateLimit(`login:${ip}`, 10, 600);
  if (!limited.ok) {
    redirect(loginUrl({ error: `Too many attempts — try again in ${retryPhrase(limited.retryAfterSeconds)}.` }));
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(loginUrl({ error: error.message }));

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const ip = await clientIp();
  const limited = await rateLimit(`signup:${ip}`, 10, 600);
  if (!limited.ok) {
    redirect(loginUrl({ error: `Too many attempts — try again in ${retryPhrase(limited.retryAfterSeconds)}.` }));
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (password.length < 6) {
    redirect(loginUrl({ error: "Password must be at least 6 characters." }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(loginUrl({ error: error.message }));

  // If email confirmation is enabled in Supabase, there is no session yet.
  if (!data.session) {
    redirect(
      loginUrl({ notice: "Account created — check your email to confirm, then log in." })
    );
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signInWithGoogle() {
  const ip = await clientIp();
  const limited = await rateLimit(`oauth:${ip}`, 15, 600);
  if (!limited.ok) {
    redirect(loginUrl({ error: `Too many attempts — try again in ${retryPhrase(limited.retryAfterSeconds)}.` }));
  }

  const supabase = await createClient();
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=/dashboard` },
  });

  if (error || !data.url) {
    redirect(loginUrl({ error: error?.message ?? "Could not start Google sign-in." }));
  }

  // Hand off to Google's consent screen; it returns to /auth/callback with a code.
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  const ip = await clientIp();
  const limited = await rateLimit(`reset:${ip}`, 5, 900);
  if (!limited.ok) {
    redirect(
      `/forgot-password?${new URLSearchParams({
        error: `Too many requests — try again in ${retryPhrase(limited.retryAfterSeconds)}.`,
      }).toString()}`
    );
  }

  const email = String(formData.get("email") ?? "").trim();

  if (email) {
    const supabase = await createClient();
    const origin = await requestOrigin();
    // Errors are intentionally swallowed — we never reveal whether an email is registered.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });
  }

  redirect("/forgot-password?sent=1");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const resetUrl = (msg: string) =>
    `/reset-password?${new URLSearchParams({ error: msg }).toString()}`;

  const ip = await clientIp();
  const limited = await rateLimit(`update-pw:${ip}`, 15, 600);
  if (!limited.ok) {
    redirect(resetUrl(`Too many attempts — try again in ${retryPhrase(limited.retryAfterSeconds)}.`));
  }

  if (password.length < 6) {
    redirect(resetUrl("Password must be at least 6 characters."));
  }
  if (password !== confirm) {
    redirect(resetUrl("Those passwords don't match."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(resetUrl("Your reset link has expired. Request a new one."));
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(resetUrl(error.message));
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
