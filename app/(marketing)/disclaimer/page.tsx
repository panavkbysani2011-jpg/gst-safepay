import type { Metadata } from "next";
import { LegalDoc, LegalSection } from "../../_components/LegalDoc";

export const metadata: Metadata = { title: "Disclaimer · GST SafePay" };

export default function DisclaimerPage() {
  return (
    <LegalDoc
      title="Disclaimer"
      updated="3 July 2026"
      intro="GST SafePay is a money-safety decision-support tool. It is not tax, legal or accounting advice."
    >
      <LegalSection heading="Not tax advice">
        <p>The figures GST SafePay shows (lost deductions, penalty interest, ITC at risk and so on) are computed from published rule parameters, such as the RBI bank rate, the MSMED interest multiplier and assumed tax rates. During beta these parameters are <strong>placeholder defaults</strong>. A qualified chartered accountant needs to review and confirm them before you rely on any number for a real payment or filing.</p>
      </LegalSection>

      <LegalSection heading="Deterministic and auditable, but only as good as its inputs">
        <p>Calculations are deterministic and traceable: every figure links to a rule and a legal basis you can inspect. However, outputs depend entirely on the accuracy and completeness of the data you upload. Wrong or missing rows produce wrong conclusions.</p>
      </LegalSection>

      <LegalSection heading="Prototype status">
        <p>The current build runs on synthetic demonstration data and has not been certified against live GST-portal data. Treat it as an aid to a conversation with your CA, not a replacement for professional judgement or official portals.</p>
      </LegalSection>

      <LegalSection heading="No liability">
        <p>You are solely responsible for your tax decisions. GST SafePay accepts no liability for tax, interest, penalties or other loss arising from use of, or reliance on, the Service.</p>
      </LegalSection>
    </LegalDoc>
  );
}
