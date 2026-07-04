"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteAccount } from "@/app/account-actions";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center rounded-lg bg-danger px-4 text-sm font-semibold text-white transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Yes, permanently delete everything"}
    </button>
  );
}

export function DeleteAccountButton() {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-danger/50 px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Delete my account
      </button>
    );
  }

  return (
    <form action={deleteAccount} className="flex flex-col gap-3">
      <p className="text-[13px] leading-relaxed text-danger">
        This permanently deletes your account and <strong>all</strong> your data —
        vendors, bills, GST/IMS records, reverse-charge purchases and compliance
        filings. It cannot be undone.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <ConfirmButton />
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border-strong px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
