import type { Metadata } from "next";
import { LegalDoc, LegalSection } from "../../_components/LegalDoc";

export const metadata: Metadata = { title: "Terms of Service — GST SafePay" };

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Service"
      updated="3 July 2026"
      intro="By creating an account or using GST SafePay (“the Service”), you agree to these terms. Please read them alongside our Disclaimer and Privacy Policy."
    >
      <LegalSection heading="The Service">
        <p>GST SafePay helps GST-registered businesses in India spot potential money loss under MSME payment, GST IMS, reverse-charge and related rules by applying deterministic calculations to data you provide. It is a decision-support tool, not a filing service and not a substitute for a chartered accountant.</p>
      </LegalSection>

      <LegalSection heading="Your account">
        <p>You are responsible for the accuracy of the data you upload and for keeping your login credentials secure. You must have the right to upload any business or third-party data you bring into the Service.</p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <ul>
          <li>Do not upload unlawful content or data you are not authorised to process.</li>
          <li>Do not attempt to breach, probe or disrupt the Service or other accounts.</li>
          <li>Do not resell or misrepresent the Service&apos;s outputs as certified tax advice.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="No professional advice">
        <p>Outputs are generated from configurable rule parameters that are <strong>placeholder defaults during beta</strong> and must be verified by a chartered accountant before you act on them. You remain solely responsible for your tax positions and filings. See the <a href="/disclaimer">Disclaimer</a>.</p>
      </LegalSection>

      <LegalSection heading="Availability & changes">
        <p>The Service is provided on an “as is” and “as available” basis during beta and may change or be interrupted. We may update these terms; material changes will be reflected by the “last updated” date above.</p>
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        <p>To the maximum extent permitted by law, GST SafePay is not liable for any indirect or consequential loss, or for tax, interest or penalties arising from reliance on the Service. Nothing here limits liability that cannot be excluded under Indian law.</p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p>These terms are governed by the laws of India, subject to the jurisdiction of the courts of Karnataka.</p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p><a href="mailto:panavkbysani2011@gmail.com">panavkbysani2011@gmail.com</a></p>
      </LegalSection>
    </LegalDoc>
  );
}
