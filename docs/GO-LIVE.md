# GST SafePay — Go-Live Runbook (owner actions)

The app is built and deployed. These are the steps only you can do (dashboards, accounts, money) to take it from prototype to a real product. Do them roughly in this order. Anything marked **(dev)** is code/config I handle — this list is your side.

Project references:
- Live app: `https://gst-safepay.vercel.app`
- Supabase project ref: `lminrxigtxlgnxacufpv`
- Hosting: Vercel project `gst-safepay`

---

## 1. Get the numbers verified by a CA — the gate for "real"
Hand a chartered accountant **`docs/CA-REVIEW.md`**. It lists every rate, threshold and formula with its legal basis and the simplifications to confirm. Until they sign off, the "not tax advice / prototype" wording **stays** — it's the honest state. This is the single most important step; everything else is plumbing.

## 2. Email — pick one (needed so signup/reset work for real users)
Custom SMTP is already wired to Brevo, but sending *from* a Gmail address means many mails get spam-filtered. Two honest options:

- **Recommended for now — turn OFF email confirmation.** Supabase → **Authentication → Providers → Email** → turn off **"Confirm email"** → Save. New users can then sign up and use the app immediately, no email needed. (Password reset still emails, but that's occasional.)
- **Proper fix (with the domain, step 5)** — once you own a domain, verify it in Brevo and send from `noreply@yourdomain`. Then confirmation emails deliver reliably and you can turn confirmation back on. I'll walk you through the Brevo domain records when you have the domain.

## 3. Enable "Sign in with Google" (optional but nice)
The button and callback are already coded; they're just hidden until you switch it on. Full steps are in **`SETUP-AUTH.md`** (section 3). Short version:
1. **Google Cloud Console** → create a project → **APIs & Services → OAuth consent screen** (External, add app name + your email) → **Credentials → Create OAuth client ID → Web application**.
2. Authorised redirect URI: `https://lminrxigtxlgnxacufpv.supabase.co/auth/v1/callback`
3. Copy the Client ID + Secret → **Supabase → Authentication → Providers → Google** → paste + enable.
4. **Vercel → gst-safepay → Settings → Environment Variables** → add `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED = true` → redeploy. The button then appears on the login page.

## 4. Rotate the Supabase keys (security hygiene before real users)
The anon/publishable key has been visible in dev configs over time. **Supabase → Project Settings → API → "Reset"/rotate** the anon (publishable) key, then update it in **Vercel → Environment Variables** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) and redeploy. (The `service_role` key is not used by the app — keep it secret regardless.)

## 5. Buy a domain + wire it up (you deferred this to last)
1. Buy a domain (~₹700–1,000/yr). Easiest: buy it inside **Vercel → gst-safepay → Settings → Domains** so it auto-connects. Or any registrar (Cloudflare/Hostinger) and tell me — I'll give the DNS records.
2. Once it resolves, I update the Supabase **Site URL** + redirect allowlist and the app's canonical URLs **(dev)**.
3. Verify the domain in **Brevo** (add the SPF/DKIM records) so email sends from `noreply@yourdomain` and stops hitting spam. I'll give you the exact records.

## 6. Decide: free or paid?
There's a refund/cancellation page implying paid plans. If you want to charge, tell me and I'll integrate **Razorpay** (India-standard subscriptions) **(dev)** — you'll create a Razorpay account and give me the key IDs. If free for now, we leave it and the copy stays honest.

## 7. Error monitoring (know when something breaks for a user)
Sign up at **sentry.io** (free tier), create a Next.js project, copy the **DSN**. Give it to me (or add `SENTRY_DSN` in Vercel) and I'll wire it up **(dev)** so runtime errors are captured instead of failing silently.

## 8. Backups
Supabase takes automatic daily backups on paid plans. Confirm your plan includes them (**Supabase → Database → Backups**); on the free tier, consider a periodic manual `pg_dump` or upgrading before real customer data lands.

## 9. LAST — drop the "beta / prototype" framing
Only after **step 1 (CA sign-off)** is done: tell me and I'll remove the "Beta" badge and soften the disclaimers across the app **(dev)**. Doing this earlier would mean presenting unverified tax numbers as authoritative — don't.

---

### Quick recap of what's already done (so you don't redo it)
- App built + deployed, all modules working, RLS + security headers + nonce CSP + rate limiting live.
- DPDP export/delete-my-data working; data-rights coverage guarded by a test.
- Custom SMTP (Brevo) configured; Site URL set to the Vercel domain.
- Your login works (password was reset for you this session).
