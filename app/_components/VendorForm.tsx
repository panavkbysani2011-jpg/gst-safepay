"use client";

import { useActionState, useEffect } from "react";
import { saveVendor } from "@/app/vendor-actions";
import { UDYAM_CATEGORIES } from "@/lib/vendorForm";
import { FormSubmit } from "./FormSubmit";
import type { VendorRowView } from "./VendorsTable";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-[14px] text-fg transition-colors placeholder:text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

const checkboxClass =
  "size-4 shrink-0 rounded border-border accent-[var(--accent)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

// Add (vendor = null) or edit (vendor set) a supplier. Prefilled from the row so
// existing gstinActive / Udyam values are never clobbered by defaults on save.
export function VendorForm({
  vendor,
  onSaved,
}: {
  vendor?: VendorRowView | null;
  onSaved: () => void;
}) {
  const [state, formAction] = useActionState(saveVendor, null);

  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {vendor && <input type="hidden" name="id" value={vendor.vendorId} />}

      <label className="block">
        <span className="text-[13px] font-medium text-fg">Business name</span>
        <input
          name="name"
          type="text"
          required
          maxLength={200}
          defaultValue={vendor?.vendorName ?? ""}
          placeholder="e.g. Acme Traders Pvt Ltd"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="text-[13px] font-medium text-fg">GSTIN</span>
        <input
          name="gstin"
          type="text"
          required
          maxLength={20}
          autoCapitalize="characters"
          defaultValue={vendor?.gstin ?? ""}
          placeholder="e.g. 27AAPFU0939F1ZV"
          className={`${inputClass} font-mono uppercase`}
        />
        <span className="mt-1 block text-[11.5px] text-muted">
          Format and checksum are checked after saving; an invalid GSTIN is flagged, not blocked.
        </span>
      </label>

      <label className="flex items-center gap-2.5 text-[13px] text-fg">
        <input
          name="gstinActive"
          type="checkbox"
          defaultChecked={vendor?.gstinActive ?? true}
          className={checkboxClass}
        />
        GSTIN is active on the portal
      </label>

      <label className="flex items-center gap-2.5 text-[13px] text-fg">
        <input
          name="udyamRegistered"
          type="checkbox"
          defaultChecked={vendor?.udyamRegistered ?? false}
          className={checkboxClass}
        />
        Udyam (MSME) registered
      </label>

      <label className="block">
        <span className="text-[13px] font-medium text-fg">MSME category</span>
        <select
          name="udyamCategory"
          defaultValue={vendor?.udyamCategory ?? ""}
          className={inputClass}
        >
          <option value="">Not registered / unknown</option>
          {UDYAM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[11.5px] text-muted">
          Needed for the 45-day MSME payment rule once the supplier is registered.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <FormSubmit pendingLabel="Saving…">
          {vendor ? "Save changes" : "Add vendor"}
        </FormSubmit>
        {state && !state.ok && (
          <p role="status" className="text-[12.5px] font-medium text-danger">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
