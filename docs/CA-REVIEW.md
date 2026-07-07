# GST SafePay — Chartered Accountant Review & Sign-off

**Purpose.** Every rupee figure in GST SafePay is produced by a small set of deterministic rules with fixed, editable parameters. Today those parameters are **placeholder defaults**, which is why the app shows "not tax advice — verify with a CA" everywhere. This document lists every rule, its current default, the legal basis it is *intended* to reflect, and the simplifications a chartered accountant must confirm or correct **before the product presents these numbers as reliable**.

Nothing here is a claim that the current values are correct. They are the starting assumptions to be reviewed.

**How the numbers are produced.** The app never guesses. Each figure is a pure function of (a) the data the user imports and (b) the parameters below. Every parameter is editable per account in **Settings → Rule configuration** (no code change needed), so once you confirm the right values for a firm, they flow into every calculation. Source of truth for the shipped defaults: `lib/rules/types.ts`.

**How to sign off.** For each module: confirm or correct each parameter in the table, and confirm or flag each "simplification to verify." Record the outcome in the sign-off block at the end.

---

## Module 1 — MSME payments (§43B(h) + MSMED Act)

Engine: `lib/rules/paymentDeadline.ts`. Flags bills to micro/small suppliers that breach the statutory payment window, and sizes the cost.

**Who it applies to.** Only suppliers marked **Udyam-registered** and category **micro** or **small**. Medium enterprises and non-Udyam suppliers are treated as not-applicable. *CA to confirm this scope matches §43B(h) / MSMED Act §15.*

| Parameter | Current default | Meaning | Intended legal basis |
|---|---|---|---|
| `statutoryMaxDaysWithAgreement` | **45** | Max payment term when a written agreement exists | MSMED Act §15 |
| `statutoryMaxDaysWithoutAgreement` | **15** | Deadline when there is no written agreement | MSMED Act §15 |
| `rbiBankRatePercent` | **6.5** | RBI notified bank rate | Input to MSMED §16 interest |
| `msmedInterestMultiplier` | **3** | Interest = this × bank rate | MSMED Act §16 |
| `assumedMarginalTaxRatePercent` | **25** | Rate used to size the disallowed-deduction cost | Income-tax §43B(h) |

**Deadline.** `acceptanceDate + applicableDays`. If a written agreement's term exceeds the statutory cap, the cap wins (min of the two).

**Cost of a breach = (A) lost deduction + (B) penalty interest:**
- **(A) Lost deduction** = `billAmount × marginalTaxRate` (default 25%). Models the §43B(h) disallowance of the expense.
- **(B) MSMED interest** = compound interest at `(multiplier × bankRate)` = `3 × 6.5% = 19.5% p.a.`, **compounded monthly**, accruing from the day after the deadline until payment (or today if unpaid).

**Simplifications to verify (important):**
1. **§43B(h) is treated as a permanent loss for the year even if the bill is later paid.** In reality the disallowance is a *timing* difference and does not bite if the amount is paid before the financial-year end (31 March). The app currently flags any late/unpaid MSME bill as a full deduction loss — this can **overstate** risk for bills paid late but within the same FY. *CA to confirm whether to model the 31-March cutoff.*
2. **Interest compounding.** The app compounds monthly and rounds partial months up. Confirm the compounding convention and that `19.5%` reflects the current bank rate × multiplier.
3. **Marginal tax rate (25%) is a single global default.** Real rate depends on entity type (individual slab / company 25% or 30% / LLP 30% + surcharge/cess). Should be set per firm.
4. **Payment "due-soon" warning window is a fixed 7 days** and is *not* currently CA-editable (unlike the other modules). Flag if this should be configurable.

---

## Module 2 — GST IMS (Invoice Management System) monthly close

Engine: `lib/rules/imsClose.ts`. Flags supplier invoices that will be **deemed accepted** into GSTR-2B if not actioned, and sizes the input-tax-credit (ITC) at stake.

| Parameter | Current default | Meaning | Intended legal basis |
|---|---|---|---|
| `gstr2bCutoffDayOfNextMonth` | **14** | Day of the following month GSTR-2B is generated; unactioned invoices are deemed accepted | GST GSTR-2B generation |
| `dueSoonWindowDays` | **3** | Warn this many days before the cutoff | Operational |
| `wrongItcInterestRatePercent` | **18** | Interest p.a. on wrongly-availed ITC | GST §50 |

**How it computes.** Cutoff = 14th of the month after the invoice's tax period. An unactioned invoice past its cutoff is "auto-accepted." If that invoice is **known-ineligible**, the exposure = `gstAmount` (reversible ITC principal) + **simple** interest at 18% p.a. from the cutoff to today (GST §50). Eligible/unsure invoices carry the ITC as "at risk / to review," not as a realized loss.

**Simplifications to verify:**
1. Confirm the **14th** cutoff and that deemed-acceptance is the correct treatment for the taxpayer's filing pattern.
2. **§50 interest is simple, not compound**, and runs cutoff→today. Confirm rate (18%) and the accrual window.
3. Only **explicitly-marked ineligible** invoices are counted as a loss. Confirm this is the intended conservative stance.

---

## Module 3 — Reverse charge (RCM, Rule 47A)

Engine: `lib/rules/rcmWatch.ts`. Tracks two RCM deadlines: the self-invoice (Rule 47A) and the cash payment of RCM tax.

| Parameter | Current default | Meaning | Intended legal basis |
|---|---|---|---|
| `selfInvoiceDays` | **30** | Days to issue a self-invoice for an unregistered supplier | Rule 47A (from 1 Nov 2024) |
| `timeOfSupplyDaysGoods` | **30** | Time-of-supply cap for goods | GST §12(3) |
| `timeOfSupplyDaysServices` | **60** | Time-of-supply cap for services | GST §13(3) |
| `gstr3bDueDayOfNextMonth` | **20** | Day of next month the RCM cash tax is due | GSTR-3B |
| `latePaymentInterestRatePercent` | **18** | Interest p.a. on late RCM tax | GST §50 |
| `lateSelfInvoicePenalty` | **10000** | Penalty for a missed self-invoice | GST §122 |
| `dueSoonWindowDays` | **7** | Warning window before an RCM deadline | Operational |

**How it computes.** Self-invoice applies only when the supplier is **unregistered**; deadline = `supplyDate + 30 days`; missing it flags a flat ₹10,000 penalty. Time of supply = `supplyDate + 30/60 days`; the RCM cash tax is then due on the **20th of the month after** the time-of-supply month; late payment accrues simple 18% p.a. interest.

**Simplifications to verify:**
1. **`lateSelfInvoicePenalty` is a flat ₹10,000.** §122 is "₹10,000 **or the tax amount, whichever is higher**." The app uses the flat floor and does not take the higher-of. *CA to confirm whether to implement whichever-is-higher.*
2. **Time of supply is modelled as a simple `supplyDate + cap`.** The statutory time of supply is the *earliest* of several events (payment date, receipt, invoice+cap). Confirm the simplification is acceptable.
3. GSTR-3B due day (20th) varies by state/turnover (20/22/24). Set per firm.
4. §50 interest is simple; confirm rate and window.

---

## Module 4 — Vendor GSTIN verification

Engine: `lib/rules/gstin.ts` + `lib/rules/vendorVerification.ts`.

| Parameter | Current default | Meaning | Basis |
|---|---|---|---|
| `recheckCadenceDays` | **180** | Re-verify each vendor's GSTIN/Udyam at least this often | Operational policy |

**How it computes.** GSTIN is validated **offline**: 15-character format + the official **mod-36 check digit**. This proves a GSTIN is well-formed; it does **not** confirm the number is live/active on the GST portal (that needs a paid portal API, deferred). Vendors not re-checked within the cadence are flagged.

**To verify:** confirm the checksum algorithm against the official GSTN spec (the app implements the standard base-36 weighted mod-36), and set the re-check cadence per firm policy. Note clearly to users that "valid format" ≠ "active on portal."

---

## Module 5 — Compliance calendar & evidence

Engine: `lib/rules/compliance.ts`.

| Parameter | Current default | Meaning | Basis |
|---|---|---|---|
| `dueSoonWindowDays` | **7** | Flag a filing as due-soon this many days before its deadline | Operational |

**How it computes.** Purely date-based: filings are overdue / due-soon / upcoming / filed based on the due dates the user enters, plus an "evidence gap" flag when something is marked filed but has no ARN/challan reference stored. **It does not itself know statutory due dates** — the user supplies them. *CA to confirm whether the product should ship a built-in statutory due-date calendar (GSTR-1/3B, TDS, PF/ESI, ROC, etc.) rather than relying on user-entered dates.* No late-filing penalty is currently computed.

---

## Cross-cutting notes for the CA
- All dates are handled as calendar days in UTC; "today" is the server date. No time-of-day effects.
- Money is stored as floating-point rupees in the prototype (`schema.prisma` note: switch to integer paise / Decimal before real money). **Flag: for a production money tool, confirm rounding/precision requirements.**
- Every figure links in-app to the rule and legal basis behind it (the computation drawers), so a reviewer can trace any number.

## Sign-off

| Module | Reviewed by (CA name & membership no.) | Parameters confirmed / corrected | Date |
|---|---|---|---|
| 1 — MSME payments | | | |
| 2 — GST IMS | | | |
| 3 — Reverse charge | | | |
| 4 — Vendor GSTIN | | | |
| 5 — Compliance | | | |

**Only after every module above is signed off** should the "prototype / sample data / not tax advice" framing be reconsidered. Until then it must stay.
