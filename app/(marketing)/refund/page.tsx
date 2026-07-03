import type { Metadata } from "next";
import { LegalDoc, LegalSection } from "../../_components/LegalDoc";

export const metadata: Metadata = { title: "Refund & Cancellation — GST SafePay" };

export default function RefundPage() {
  return (
    <LegalDoc
      title="Refund & Cancellation"
      updated="3 July 2026"
      intro="GST SafePay is free during beta. This policy describes how billing, cancellations and refunds will work once paid plans are introduced."
    >
      <LegalSection heading="During beta">
        <p>The Service is currently offered free of charge while in beta. No payment is collected, so no refund is applicable.</p>
      </LegalSection>

      <LegalSection heading="Paid plans (when introduced)">
        <ul>
          <li>Subscriptions will be billed monthly or annually in advance, with pricing shown clearly before you pay.</li>
          <li>You may cancel at any time; cancellation stops the next renewal and you keep access until the end of the paid period.</li>
          <li>We plan to offer a <strong>7-day refund</strong> on a first paid subscription if the Service does not work as described — contact us within 7 days of the charge.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="How to request">
        <p>Email <a href="mailto:panavkbysani2011@gmail.com">panavkbysani2011@gmail.com</a> from your account email with your request. Approved refunds are returned to the original payment method within a reasonable period, subject to payment-provider timelines.</p>
      </LegalSection>
    </LegalDoc>
  );
}
