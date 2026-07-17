export function ComplianceDisclaimer() {
  return (
    <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-fg">
      <span className="font-semibold text-warning">
        Beta, not tax advice.
      </span>{" "}
      The tax-rule parameters (RBI bank rate, MSMED interest multiplier,
      deduction rate) are placeholder defaults and must be verified by a
      chartered accountant before you rely on these figures for real payments.
    </div>
  );
}
