"use client";

import { useActionState } from "react";
import { saveBill, type BillActionResult } from "@/app/bill-actions";
import type { RankedRisk, VendorOption } from "@/lib/data/dashboard";
import { FormSubmit } from "./FormSubmit";

const FIELD =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-[13.5px] text-fg transition-colors focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
const LABEL = "block text-[12px] font-medium text-muted";

/**
 * Add or correct a bill. Prefilled from the row's raw fields, so an imported
 * typo (wrong amount, wrong date) is fixed here rather than by deleting the row
 * and re-importing the whole file.
 */
export function BillForm({
  bill,
  vendors,
  onSaved,
}: {
  /** null = adding a new bill. */
  bill: RankedRisk | null;
  vendors: VendorOption[];
  onSaved: () => void;
}) {
  const [state, formAction] = useActionState<BillActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await saveBill(prev, formData);
      if (result.ok) onSaved();
      return result;
    },
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {bill && <input type="hidden" name="id" value={bill.billId} />}

      <div>
        <label className={LABEL} htmlFor="bf-vendor">
          Supplier
        </label>
        <select
          id="bf-vendor"
          name="vendorId"
          defaultValue={bill?.vendorId ?? ""}
          required
          className={FIELD}
        >
          <option value="" disabled>
            Choose a supplier
          </option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor="bf-date">
            Bill date
          </label>
          <input
            id="bf-date"
            name="invoiceAcceptanceDate"
            type="date"
            defaultValue={bill?.invoiceAcceptanceDate ?? ""}
            required
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="bf-amount">
            Amount (₹)
          </label>
          <input
            id="bf-amount"
            name="amount"
            inputMode="decimal"
            defaultValue={bill ? String(bill.amount) : ""}
            placeholder="100000"
            required
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor="bf-terms">
            Agreed payment term (days)
          </label>
          <input
            id="bf-terms"
            name="agreedPaymentDays"
            inputMode="numeric"
            defaultValue={bill?.agreedPaymentDays ?? ""}
            placeholder="leave blank for the legal default"
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="bf-paid">
            Paid date
          </label>
          <input
            id="bf-paid"
            name="paidDate"
            type="date"
            defaultValue={bill?.paidDate ?? ""}
            className={FIELD}
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-[13px] text-fg">
        <input
          type="checkbox"
          name="hasWrittenAgreement"
          defaultChecked={bill?.hasWrittenAgreement ?? true}
          className="size-4 rounded border-border-strong accent-[var(--accent)]"
        />
        There is a written agreement with this supplier
      </label>
      <p className="-mt-2 text-[11.5px] text-muted">
        Without one, the shorter statutory deadline applies, so this changes the date
        the money becomes at risk.
      </p>

      {state && !state.ok && (
        <p className="text-[12.5px] text-danger">{state.message}</p>
      )}

      <FormSubmit pendingLabel="Saving…">{bill ? "Save changes" : "Add bill"}</FormSubmit>
    </form>
  );
}
