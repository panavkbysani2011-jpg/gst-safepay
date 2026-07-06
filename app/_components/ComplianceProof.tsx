"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  getComplianceProofUrl,
  removeComplianceProof,
  uploadComplianceProof,
} from "@/app/compliance-actions";

function UploadButton({ hasFile }: { hasFile: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center rounded-lg border border-border-strong bg-surface px-3 text-[13px] font-medium text-fg transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
    >
      {pending ? "Uploading…" : hasFile ? "Replace file" : "Upload proof file"}
    </button>
  );
}

export function ComplianceProof({
  deadlineId,
  hasFile: initialHasFile,
}: {
  deadlineId: string;
  hasFile: boolean;
}) {
  const [result, formAction] = useActionState(uploadComplianceProof, null);
  const [removed, setRemoved] = useState(false);
  const [busy, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const hasFile = (initialHasFile || result?.ok === true) && !removed;

  function view() {
    setNote(null);
    startTransition(async () => {
      const url = await getComplianceProofUrl(deadlineId);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else setNote("That file is no longer available.");
    });
  }

  function remove() {
    startTransition(async () => {
      const r = await removeComplianceProof(deadlineId);
      setNote(r.message);
      if (r.ok) setRemoved(true);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">Proof document</p>

      {hasFile && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={view}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-semibold text-accent-fg transition-[filter] duration-150 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {busy ? "Opening…" : "View proof"}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-lg border border-danger/40 px-3 text-[13px] font-medium text-danger transition-colors hover:bg-danger-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
          >
            Remove
          </button>
        </div>
      )}

      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="deadlineId" value={deadlineId} />
        <input
          type="file"
          name="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          required
          className="max-w-full text-[12.5px] text-muted file:mr-3 file:rounded-lg file:border file:border-border-strong file:bg-surface-2 file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium file:text-fg hover:file:bg-surface"
        />
        <UploadButton hasFile={hasFile} />
      </form>

      <p className="text-[11px] text-faint">PDF, PNG or JPG · up to 5 MB · stored privately, only you can open it.</p>

      {(result || note) && (
        <p
          className={`text-[12px] ${
            note && !note.startsWith("Proof")
              ? "text-danger"
              : result && !result.ok
                ? "text-danger"
                : "text-success"
          }`}
        >
          {note ?? result?.message}
        </p>
      )}
    </div>
  );
}
