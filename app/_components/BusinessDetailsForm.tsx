"use client";

import { useActionState } from "react";
import { saveBusinessProfile } from "@/app/profile-actions";
import type { BusinessProfile } from "@/lib/businessProfile";
import { FormSubmit } from "./FormSubmit";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-[14px] text-fg transition-colors placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

export function BusinessDetailsForm({ profile }: { profile: BusinessProfile }) {
  const [state, formAction] = useActionState(saveBusinessProfile, null);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
      <label className="block">
        <span className="text-[13px] font-medium text-fg">Business name</span>
        <input
          name="businessName"
          type="text"
          maxLength={120}
          defaultValue={profile.businessName ?? ""}
          placeholder="e.g. Acme Traders Pvt Ltd"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="text-[13px] font-medium text-fg">GSTIN</span>
        <input
          name="gstin"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          maxLength={15}
          defaultValue={profile.gstin ?? ""}
          placeholder="e.g. 27AAPFU0939F1ZV"
          className={`${inputClass} font-mono uppercase`}
        />
        <span className="mt-1 block text-[11.5px] text-muted">
          We check the format and checksum offline. That does not confirm the GSTIN is live on the portal.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <FormSubmit pendingLabel="Saving…">Save details</FormSubmit>
        {state && (
          <p
            role="status"
            className={`text-[12.5px] font-medium ${state.ok ? "text-success" : "text-danger"}`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
