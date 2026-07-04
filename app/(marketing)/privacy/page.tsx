import type { Metadata } from "next";
import { LegalDoc, LegalSection } from "../../_components/LegalDoc";

export const metadata: Metadata = { title: "Privacy Policy — GST SafePay" };

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      updated="3 July 2026"
      intro="This policy explains what data GST SafePay collects, why, where it is stored, and the choices you have. It is written to align with India's Digital Personal Data Protection Act, 2023 (DPDP Act)."
    >
      <LegalSection heading="What we collect">
        <ul>
          <li><strong>Account data</strong> — the email address you sign up with, and authentication metadata handled by our auth provider.</li>
          <li><strong>Business data you upload</strong> — the vendor, bill, GST invoice, reverse-charge and compliance records in the CSV files you import. This may include supplier names, GSTINs and amounts.</li>
          <li><strong>Basic technical logs</strong> — standard server logs needed to operate and secure the service.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="How we use it">
        <p>Your uploaded data is used only to run the deterministic tax-rule calculations that power your dashboard, and to show them back to you. We do <strong>not</strong> sell your data, share it for advertising, or use it to train any machine-learning model.</p>
      </LegalSection>

      <LegalSection heading="Where it is stored">
        <p>Data is held in a managed PostgreSQL database (Supabase, hosted in the Asia-Pacific region) and is logically scoped to your account — each account can only read its own records. Access is protected by authentication on every request.</p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>Under the DPDP Act you may request access to, correction of, or deletion of your personal data. You can clear all data you have imported at any time from the in-app <strong>Import → Clear all my data</strong> control. To close your account or request a full export, email us.</p>
      </LegalSection>

      <LegalSection heading="Retention">
        <p>We keep your data for as long as your account is active. When you delete data in-app it is removed from the live database. Backups, if any, are rotated on a rolling basis.</p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>Questions or requests: <a href="mailto:panavkbysani2011@gmail.com">panavkbysani2011@gmail.com</a>.</p>
      </LegalSection>
    </LegalDoc>
  );
}
