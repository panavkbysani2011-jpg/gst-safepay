"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
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

type CardConfig = {
  step: number;
  action: UploadAction;
  title: string;
  purpose: string;
  sample: string;
  columns: string;
  viewHref: string;
  viewLabel: string;
  note?: string;
};

const CARDS: CardConfig[] = [
  {
    step: 1,
    action: uploadVendorsCsv,
    title: "Vendors",
    purpose: "Your suppliers. Upload this first — everything else links to it.",
    sample: "/samples/vendors-sample.csv",
    columns: "id, name, gstin, gstinActive, udyamRegistered, udyamCategory",
    viewHref: "/vendors",
    viewLabel: "View vendors",
  },
  {
    step: 2,
    action: uploadBillsCsv,
    title: "Bills / payables",
    purpose: "Invoices you owe suppliers. Used to flag MSME 45-day deadlines.",
    sample: "/samples/bills-sample.csv",
    columns:
      "id, vendorId, invoiceAcceptanceDate, amount, hasWrittenAgreement, agreedPaymentDays, paidDate",
    viewHref: "/payments",
    viewLabel: "View payments",
    note: "Each row's vendorId must match a vendor id you uploaded in step 1.",
  },
  {
    step: 3,
    action: uploadImsCsv,
    title: "GST IMS invoices",
    purpose: "Supplier invoices from the GST portal IMS. Flags 2B cutoff risk.",
    sample: "/samples/ims-sample.csv",
    columns:
      "id, vendorId, vendorName, invoiceNo, taxPeriod, taxableValue, gstAmount, imsAction, eligibility",
    viewHref: "/ims",
    viewLabel: "View IMS",
  },
  {
    step: 4,
    action: uploadRcmCsv,
    title: "Reverse-charge purchases",
    purpose: "RCM purchases. Watches self-invoice and cash-GST deadlines.",
    sample: "/samples/rcm-sample.csv",
    columns:
      "id, vendorId, vendorName, supplierUnregistered, supplyType, supplyDate, rcmTaxAmount, selfInvoiceIssued, rcmTaxPaidDate",
    viewHref: "/rcm",
    viewLabel: "View reverse charge",
  },
  {
    step: 5,
    action: uploadComplianceCsv,
    title: "Compliance deadlines",
    purpose: "Your filing calendar (GST, TDS, PF, ROC) with an evidence reference.",
    sample: "/samples/compliance-sample.csv",
    columns: "id, name, authority, period, dueDate, filedDate, proofRef",
    viewHref: "/compliance",
    viewLabel: "View compliance",
  },
];

function PendingButton({
  children,
  variant = "ghost",
}: {
  children: React.ReactNode;
  variant?: "solid" | "ghost" | "danger";
}) {
  const { pending } = useFormStatus();
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-[background-color,filter,transform] duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60";
  const styles =
    variant === "solid"
      ? "bg-accent text-accent-fg hover:brightness-110"
      : variant === "danger"
        ? "border border-danger/40 text-danger hover:bg-danger-soft"
        : "border border-border-strong text-fg hover:bg-surface-2";
  return (
    <button type="submit" disabled={pending} className={`${base} ${styles}`}>
      {pending ? "Working…" : children}
    </button>
  );
}

function UploadCard({ card }: { card: CardConfig }) {
  const [state, formAction] = useActionState(card.action, null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputRef.current.files = dt.files;
      setFileName(file.name);
    }
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent-text">
          {card.step}
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-semibold text-fg">
            {card.title}
          </h3>
          <p className="mt-0.5 text-[13px] text-muted">{card.purpose}</p>
        </div>
      </div>

      <a
        href={card.sample}
        download
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-accent-text transition-colors hover:bg-accent-soft"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
        </svg>
        Download sample CSV
      </a>

      <p className="font-mono text-[11px] leading-relaxed text-faint">
        columns: {card.columns}
      </p>
      {card.note && (
        <p className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11.5px] text-muted">
          {card.note}
        </p>
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
          dragOver ? "border-accent bg-accent-soft" : "border-border-strong hover:bg-surface-2"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="size-5 text-faint" aria-hidden>
          <path d="M12 16V4m0 0L8 8m4-4 4 4" />
          <path d="M4 20h16" />
        </svg>
        <span className="text-[13px] font-medium text-fg">
          {fileName ?? "Drop your CSV here, or click to browse"}
        </span>
        <span className="text-[11px] text-faint">.csv only</span>
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="sr-only"
        />
      </label>

      <div className="flex items-center gap-3">
        <PendingButton variant="solid">Upload {card.title.toLowerCase()}</PendingButton>
        {state?.ok && (
          <Link href={card.viewHref} className="text-xs font-medium text-accent-text hover:opacity-80">
            {card.viewLabel} →
          </Link>
        )}
      </div>

      {state && (
        <div
          className={`rounded-lg px-3 py-2 text-[13px] ${
            state.ok
              ? "bg-success-soft text-success"
              : state.inserted > 0
                ? "bg-warning-soft text-warning"
                : "bg-danger-soft text-danger"
          }`}
        >
          <p className="font-medium">{state.message}</p>
          {state.errors.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-[11.5px] text-muted">
              {state.errors.slice(0, 4).map((e, i) => (
                <li key={i}>
                  {e.row > 0 ? `Row ${e.row}: ` : ""}
                  {e.message}
                </li>
              ))}
              {state.errors.length > 4 && <li>…and {state.errors.length - 4} more</li>}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

function HowItWorks() {
  const steps = [
    {
      t: "1 · You add your data",
      d: "Export a CSV from Tally, Zoho, or Excel (or load our demo). Each card below has a matching sample file.",
    },
    {
      t: "2 · We validate and store it",
      d: "Every row is checked. Valid rows are saved to your own private cloud database (Supabase, Mumbai region), tied to your login. Only you can see it.",
    },
    {
      t: "3 · Rules flag your money at risk",
      d: "A deterministic tax-rule engine (MSMED 45-day, GST IMS cutoff, RCM, GSTIN checks) computes exactly what could cost you money, and shows the working.",
    },
  ];
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
      <h2 className="font-display text-base font-semibold text-fg">How this works</h2>
      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.t} className="flex flex-col gap-1">
            <p className="text-[13px] font-semibold text-accent-text">{s.t}</p>
            <p className="text-[13px] leading-relaxed text-muted">{s.d}</p>
          </li>
        ))}
      </ol>
      <div className="rounded-xl bg-surface-2 px-4 py-3 text-[12.5px] leading-relaxed text-muted">
        <span className="font-semibold text-fg">Is an AI reading my files?</span> No.
        Your data is analysed by fixed, published tax rules, not an AI that guesses.
        That is deliberate: a money-safety tool has to be auditable, so every figure
        traces back to a rule and a legal section you (or your CA) can check. Your
        files are parsed and stored privately; they are never sent to a third party
        or used to train anything.
      </div>
    </section>
  );
}

export function ImportPortal() {
  return (
    <div className="flex flex-col gap-6">
      <HowItWorks />

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-5">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-fg">
            New here? Try it in one click
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Loads realistic sample vendors, bills and filings so you can see the
            whole tool working, then clear it whenever you like.
          </p>
        </div>
        <div className="flex gap-2">
          <form action={seedDemoData}>
            <PendingButton variant="solid">Load demo data</PendingButton>
          </form>
          <form action={clearData}>
            <PendingButton variant="danger">Clear all my data</PendingButton>
          </form>
        </div>
      </section>

      <div>
        <h2 className="mb-1 font-display text-base font-semibold text-fg">
          Or upload your own
        </h2>
        <p className="mb-4 text-[13px] text-muted">
          Do them in order. Download a sample, replace the example rows with your
          data, keep the header row, then upload.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {CARDS.map((card) => (
            <UploadCard key={card.title} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}
