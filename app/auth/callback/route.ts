import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Exchanges the one-time code from a Supabase email link (password recovery,
// and later magic-link / OAuth) for a session cookie, then forwards the user on.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // Only allow same-origin relative redirects — never an attacker-supplied absolute URL.
  const rawNext = url.searchParams.get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  // Behind a proxy (Vercel) trust the forwarded host so the redirect keeps the public domain.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const base = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;

  // OAuth / recovery providers return errors as query params (e.g. provider not enabled).
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) {
    const q = new URLSearchParams({ error: providerError });
    return NextResponse.redirect(`${base}/login?${q.toString()}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  const q = new URLSearchParams({
    error: "That link is invalid or has expired. Please request a new one.",
  });
  return NextResponse.redirect(`${base}/login?${q.toString()}`);
}
