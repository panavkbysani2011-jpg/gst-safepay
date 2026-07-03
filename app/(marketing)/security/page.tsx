import type { Metadata } from "next";
import { LegalDoc, LegalSection } from "../../_components/LegalDoc";

export const metadata: Metadata = { title: "Security — GST SafePay" };

export default function SecurityPage() {
  return (
    <LegalDoc
      title="Security"
      updated="3 July 2026"
      intro="How GST SafePay protects your business data. We keep this page honest about what is in place today and what is still on the roadmap for beta."
    >
      <LegalSection heading="In place today">
        <ul>
          <li><strong>Authentication on every request</strong> — all app routes are gated; unauthenticated requests are redirected to login.</li>
          <li><strong>Per-account isolation</strong> — every database query is scoped to the logged-in account, verified so one account cannot read another&apos;s data.</li>
          <li><strong>Encryption in transit</strong> — the app is served over HTTPS, and the database connection is TLS-encrypted.</li>
          <li><strong>Managed infrastructure</strong> — hosting and the PostgreSQL database run on managed platforms (Vercel and Supabase) with encryption at rest.</li>
          <li><strong>No third-party data sharing</strong> — your data is never sold or used to train models.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="On the beta roadmap">
        <ul>
          <li>Database row-level security (RLS) as defence-in-depth beyond app-layer scoping.</li>
          <li>Rate limiting on authentication and upload endpoints.</li>
          <li>A strict Content-Security-Policy and hardened security headers.</li>
          <li>Scheduled secret/key rotation and export-my-data / delete-my-account self-service.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Reporting a vulnerability">
        <p>Found a security issue? Please email <a href="mailto:panavkbysani2011@gmail.com">panavkbysani2011@gmail.com</a> with details and steps to reproduce. We appreciate responsible disclosure and will respond as quickly as we can.</p>
      </LegalSection>
    </LegalDoc>
  );
}
