-- Row-Level Security for GST SafePay (Phase 4 — security hardening).
--
-- Why this exists:
-- The 5 app tables are accessed ONLY by the app via Prisma, which connects as the
-- `postgres` role (BYPASSRLS) — so enabling RLS never affects the app path.
-- The real risk is Supabase's auto-generated PostgREST API: `anon` and
-- `authenticated` were granted FULL privileges on these tables with no RLS, so the
-- public anon key could read / modify / TRUNCATE every tenant's data directly.
--
-- This migration:
--   1) enables RLS (defence-in-depth; Supabase best practice for public tables),
--   2) adds an owner-only policy for `authenticated` (correct isolation if these
--      tables are ever reached through PostgREST with a user JWT),
--   3) REVOKEs all access from `anon` (public/unauthenticated must touch nothing),
--   4) REVOKEs TRUNCATE from `authenticated` — TRUNCATE bypasses RLS, so a policy
--      alone would not stop a logged-in user from wiping a table.
--
-- ownerId stores the Supabase auth user id (auth.uid()) as text.
-- Re-runnable (idempotent).

-- ── Vendor ───────────────────────────────────────────────────────────────
alter table public."Vendor" enable row level security;
drop policy if exists "owner_all" on public."Vendor";
create policy "owner_all" on public."Vendor"
  for all to authenticated
  using ((select auth.uid())::text = "ownerId")
  with check ((select auth.uid())::text = "ownerId");
revoke all on public."Vendor" from anon;
revoke truncate on public."Vendor" from authenticated;

-- ── Bill ─────────────────────────────────────────────────────────────────
alter table public."Bill" enable row level security;
drop policy if exists "owner_all" on public."Bill";
create policy "owner_all" on public."Bill"
  for all to authenticated
  using ((select auth.uid())::text = "ownerId")
  with check ((select auth.uid())::text = "ownerId");
revoke all on public."Bill" from anon;
revoke truncate on public."Bill" from authenticated;

-- ── ImsInvoice ───────────────────────────────────────────────────────────
alter table public."ImsInvoice" enable row level security;
drop policy if exists "owner_all" on public."ImsInvoice";
create policy "owner_all" on public."ImsInvoice"
  for all to authenticated
  using ((select auth.uid())::text = "ownerId")
  with check ((select auth.uid())::text = "ownerId");
revoke all on public."ImsInvoice" from anon;
revoke truncate on public."ImsInvoice" from authenticated;

-- ── RcmPurchase ──────────────────────────────────────────────────────────
alter table public."RcmPurchase" enable row level security;
drop policy if exists "owner_all" on public."RcmPurchase";
create policy "owner_all" on public."RcmPurchase"
  for all to authenticated
  using ((select auth.uid())::text = "ownerId")
  with check ((select auth.uid())::text = "ownerId");
revoke all on public."RcmPurchase" from anon;
revoke truncate on public."RcmPurchase" from authenticated;

-- ── ComplianceDeadline ───────────────────────────────────────────────────
alter table public."ComplianceDeadline" enable row level security;
drop policy if exists "owner_all" on public."ComplianceDeadline";
create policy "owner_all" on public."ComplianceDeadline"
  for all to authenticated
  using ((select auth.uid())::text = "ownerId")
  with check ((select auth.uid())::text = "ownerId");
revoke all on public."ComplianceDeadline" from anon;
revoke truncate on public."ComplianceDeadline" from authenticated;
