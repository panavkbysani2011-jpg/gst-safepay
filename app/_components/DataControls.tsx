"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  clearData,
  seedDemoData,
  uploadBillsCsv,
  uploadComplianceCsv,
  uploadImsCsv,
  uploadRcmCsv,
  uploadVendorsCsv,
  type UploadResult,
} from "../actions";

type UploadAction = (
  prev: UploadResult | null,
  formData: FormData
) => Promise<UploadResult>;

function PlainSubmit({
  children,
  tone = "ghost",
}: {
  children: React.ReactNode;
  tone?: "ghost" | "danger";
}) {
  const { pending } = useFormStatus();
  const toneClass =
    tone === "danger"
      ? "border-danger/40 text-danger hover:bg-danger-soft"
      : "border-border-strong text-fg hover:bg-surface-2";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 ${toneClass}`}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

function ResultView({ state }: { state: UploadResult }) {
  return (
    <div className="mt-2 text-sm">
      <p className={state.ok ? "text-success" : "text-warning"}>
        {state.message}
      </p>
      {state.errors.length > 0 && (
        <ul className="mt-1 list-inside list-disc text-xs text-muted">
          {state.errors.slice(0, 5).map((e, i) => (
            <li key={i}>
              {e.row > 0 ? `Row ${e.row}: ` : ""}
              {e.message}
            </li>
          ))}
          {state.errors.length > 5 && (
            <li>…and {state.errors.length - 5} more</li>
          )}
        </ul>
      )}
    </div>
  );
}

function UploadForm({
  action,
  label,
  columns,
}: {
  action: UploadAction;
  label: string;
  columns: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="font-mono text-[11px] text-faint">{columns}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="max-w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-fg hover:file:bg-border"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-fg transition-[background-color,transform] duration-150 hover:bg-surface-2 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>
      {state && <ResultView state={state} />}
    </form>
  );
}

export function DataControls() {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
          Your data
        </h2>
        <div className="flex gap-2">
          <form action={seedDemoData}>
            <PlainSubmit>Load demo data</PlainSubmit>
          </form>
          <form action={clearData}>
            <PlainSubmit tone="danger">Clear all</PlainSubmit>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <UploadForm
          action={uploadVendorsCsv}
          label="1. Upload vendors"
          columns="id, name, gstin, gstinActive, udyamRegistered, udyamCategory"
        />
        <UploadForm
          action={uploadBillsCsv}
          label="2. Upload bills"
          columns="id, vendorId, invoiceAcceptanceDate, amount, hasWrittenAgreement, agreedPaymentDays, paidDate"
        />
        <UploadForm
          action={uploadImsCsv}
          label="3. Upload IMS invoices"
          columns="id, vendorId, vendorName, invoiceNo, taxPeriod, taxableValue, gstAmount, imsAction, eligibility"
        />
        <UploadForm
          action={uploadRcmCsv}
          label="4. Upload RCM purchases"
          columns="id, vendorId, vendorName, supplierUnregistered, supplyType, supplyDate, rcmTaxAmount, selfInvoiceIssued, rcmTaxPaidDate"
        />
        <UploadForm
          action={uploadComplianceCsv}
          label="5. Upload compliance deadlines"
          columns="id, name, authority, period, dueDate, filedDate, proofRef"
        />
      </div>
    </section>
  );
}
