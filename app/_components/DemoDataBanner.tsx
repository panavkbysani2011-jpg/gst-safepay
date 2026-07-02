export function DemoDataBanner() {
  return (
    <div className="rounded-lg border border-amber-800/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
      <span className="font-semibold">Synthetic demo data.</span> Vendors and
      bills below are fabricated to exercise every rule outcome. Tax-rule
      parameters (RBI bank rate, interest multiplier, deduction rate) must be
      verified by a CA before this is used with real business data.
    </div>
  );
}
