import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getRuleConfig } from "@/lib/data/ruleConfig";
import { isDefaultRuleConfig } from "@/lib/rules/ruleConfig";
import { RuleConfigEditor } from "@/app/_components/RuleConfigEditor";
import { DeleteAccountButton } from "@/app/_components/DeleteAccountButton";
import { getBusinessProfile } from "@/lib/data/businessProfile";
import { BusinessDetailsForm } from "@/app/_components/BusinessDetailsForm";

export default async function SettingsPage() {
  const user = await requireUser();
  const [config, profile] = await Promise.all([
    getRuleConfig(user.id),
    getBusinessProfile(user.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Account */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="font-display text-lg font-semibold text-fg">Account</h2>
        <dl className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <dt className="text-[13px] text-muted">Signed in as</dt>
          <dd className="text-[13.5px] font-medium text-fg">{user.email ?? "—"}</dd>
        </dl>
        <p className="mt-3 text-[12.5px] text-muted">
          Switch the colour theme any time from the toggle in the top bar.
        </p>
      </section>

      {/* Business details — firm identity shown on the action report */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="font-display text-lg font-semibold text-fg">Business details</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          Your firm name and GSTIN. These appear on the printable action report you
          hand to your CA.
        </p>
        <BusinessDetailsForm profile={profile} />
      </section>

      {/* Rule configuration — CA-editable tax parameters that drive every engine */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-fg">Rule configuration</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            The tax parameters behind every calculation. Ship-defaults reflect current
            law; your chartered accountant can correct any value for your firm and it
            flows straight into the money math, so every figure stays auditable and deterministic, with no code change.
          </p>
        </div>
        <RuleConfigEditor config={config} isCustomised={!isDefaultRuleConfig(config)} />
      </section>

      {/* Your data — export */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="font-display text-lg font-semibold text-fg">Your data</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          Download everything we hold for your account (vendors, bills, GST IMS
          invoices, reverse-charge purchases and compliance filings) as a single
          JSON file. Nothing is shared with anyone else.
        </p>
        <a
          href="/settings/export"
          download
          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
          </svg>
          Export my data
        </a>
        <p className="mt-4 border-t border-border pt-4 text-[12.5px] text-muted">
          Want to start over without deleting your account? Use{" "}
          <Link href="/import" className="font-medium text-accent-text hover:opacity-80">
            Import → Clear all my data
          </Link>
          .
        </p>
      </section>

      {/* Danger zone — delete account */}
      <section className="rounded-2xl border border-danger/30 bg-danger-soft p-6">
        <h2 className="font-display text-lg font-semibold text-danger">Delete account</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          Permanently delete your account and every record tied to it. This is
          immediate and cannot be undone, so export your data first if you might need it.
        </p>
        <div className="mt-4">
          <DeleteAccountButton />
        </div>
      </section>
    </div>
  );
}
