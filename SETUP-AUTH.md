# Auth setup (Google sign-in + password reset)

The app code for both flows is complete and correct:

- `signInWithGoogle` -> Supabase OAuth -> `/auth/callback` (exchanges the code, handles provider errors) -> `/dashboard`.
- `requestPasswordReset` -> Supabase recovery email -> `/auth/callback` -> `/reset-password` -> `updatePassword`.

Both are currently blocked on **Supabase dashboard configuration**, which can only be done by the project owner. This is the checklist. Diagnosed live on 2026-07-06: clicking Google returns `{"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}`, i.e. the provider toggle is off.

Reference values for this project:
- Supabase project ref: `lminrxigtxlgnxacufpv`
- Supabase auth callback (give this to Google): `https://lminrxigtxlgnxacufpv.supabase.co/auth/v1/callback`
- App redirect target: `https://gst-safepay.vercel.app/auth/callback`
- Production site URL: `https://gst-safepay.vercel.app`

---

## 1. Supabase URL configuration (fixes reset links; required for Google too)

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://gst-safepay.vercel.app`
  - If this is still `http://localhost:3000`, password-reset and confirmation emails link to localhost, which is very likely why reset "doesn't work". Fix this first.
- **Redirect URLs** (add both):
  - `https://gst-safepay.vercel.app/**`
  - `http://localhost:3000/**` (for local development)

## 2. Password reset email

Supabase → **Authentication → Emails**:

- Make sure the **Reset Password** template is enabled and its link uses `{{ .ConfirmationURL }}`.
- The built-in Supabase email sender is heavily rate-limited (a few messages per hour) and often lands in spam. For anything real, set **Custom SMTP** (Authentication → Emails → SMTP Settings) with a provider like Resend, SendGrid, Postmark, or Brevo.
- After step 1 + this, test: `/forgot-password` -> enter your email -> the link should open `/auth/callback?...&next=/reset-password` and land you on `/reset-password`.

## 3. Google sign-in

**a. Google Cloud Console** (create the OAuth client):
1. APIs & Services → Credentials → Create credentials → **OAuth client ID** → Web application.
2. **Authorized redirect URIs:** add `https://lminrxigtxlgnxacufpv.supabase.co/auth/v1/callback`.
3. Copy the **Client ID** and **Client secret**.

**b. Supabase** → Authentication → **Providers → Google**:
1. Enable it.
2. Paste the Client ID + Client secret. Save.

**c. Vercel** → project → Settings → Environment Variables:
1. Add `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED = true` (Production). Redeploy.
   - Until this is set, the "Continue with Google" button is intentionally hidden so no one hits the provider-not-enabled error. Email login is unaffected.

**Verify:** load `/login` (Google button now shows) → click it → Google consent → back to `/dashboard`.

---

## What the code already handles

- `/auth/callback` exchanges the one-time code, forwards provider errors back to `/login` with a readable message, and only allows same-origin redirects.
- `proxy.ts` lets `/auth/callback`, `/reset-password`, and `/forgot-password` through unauthenticated (they are in `PUBLIC_PATHS`).
- Reset requests never reveal whether an email is registered, and are rate-limited.
