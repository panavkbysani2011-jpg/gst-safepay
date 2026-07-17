"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  clearData,
  uploadBillsCsv,
  uploadComplianceCsv,
  uploadImsCsv,
  uploadRcmCsv,
  uploadVendorsCsv,
  type UploadResult,
} from "../actions";
import {
  parseBillsCsv,
  parseComplianceCsv,
  parseImsCsv,
  parseRcmCsv,
  parseVendorsCsv,
  type ParseResult,
  type VendorInput,
  type BillInput,
  type ImsInvoiceInput,
  type RcmPurchaseInput,
  type ComplianceDeadlineInput,
} from "@/lib/csv/parseCsv";
import {
  checkBillsHealth,
  checkComplianceHealth,
  checkImsHealth,
  checkRcmHealth,
  checkVendorsHealth,
  type HealthWarning,
} from "@/lib/csv/dataHealth";
import { fileToCsv } from "@/lib/csv/toCsv";
import Papa from "papaparse";
import {
  FIELD_SPECS,
  suggestMapping,
  applyMapping,
  toCanonicalCsv,
  mergeAiProposal,
  type ImportKind,
  type TargetField,
} from "@/lib/csv/fieldMapping";
import { suggestMappingWithAi } from "../mapping-actions";
import type { ImportProgress, ImportKindStatus } from "@/lib/importStatus";

type UploadAction = (
  prev: UploadResult | null,
  formData: FormData
) => Promise<UploadResult>;

// The parsers are isomorphic (pure papaparse + zod, no server-only imports), so
// the very same validation that runs server-side powers the client-side preview.
type CsvParser = (csv: string) => ParseResult<unknown>;

type CardConfig = {
  step: number;
  kind: ImportKind;
  action: UploadAction;
  parse: CsvParser;
  title: string;
  purpose: string;
  /** Plain-language description of the data this needs. Deliberately not a list
   *  of column names: since column matching landed, the file's own headers can
   *  be anything, and quoting our internal field names implied otherwise. */
  needs: string;
  viewHref: string;
  viewLabel: string;
  note?: string;
};

const CARDS: CardConfig[] = [
  {
    step: 1,
    kind: "vendors",
    action: uploadVendorsCsv,
    parse: parseVendorsCsv,
    title: "Vendors",
    purpose: "Who you buy from. Drives GSTIN checks and the MSME 45-day rule.",
    needs: "Each supplier's name and GSTIN, plus whether they are MSME/Udyam registered and in which category (micro, small or medium).",
    viewHref: "/vendors",
    viewLabel: "View vendors",
  },
  {
    step: 2,
    kind: "bills",
    action: uploadBillsCsv,
    parse: parseBillsCsv,
    title: "Bills / payables",
    purpose: "Invoices you owe suppliers. Used to flag MSME 45-day deadlines.",
    needs: "Each bill's number, the supplier, the invoice date and the amount. Optionally the agreed payment days and the date you paid it.",
    viewHref: "/payments",
    viewLabel: "View payments",
    note: "Your supplier column can be an id, a name, or a GSTIN. We match it to an existing vendor and add any supplier we have not seen, so no row is dropped. Start here if you like.",
  },
  {
    step: 3,
    kind: "ims",
    action: uploadImsCsv,
    parse: parseImsCsv,
    title: "GST IMS invoices",
    purpose: "Supplier invoices from the GST portal IMS. Flags 2B cutoff risk.",
    needs: "Each invoice's number, the supplier, the tax period, the taxable value and the GST amount. Optionally what you actioned it as, and whether the credit is eligible.",
    viewHref: "/ims",
    viewLabel: "View IMS",
  },
  {
    step: 4,
    kind: "rcm",
    action: uploadRcmCsv,
    parse: parseRcmCsv,
    title: "Reverse-charge purchases",
    purpose: "Purchases where you owe the GST, not your supplier. Watches self-invoice and cash-GST deadlines.",
    needs: "The supplier, the supply date and the reverse-charge tax amount. Optionally whether the supplier is unregistered, goods or services, and whether you issued the self-invoice.",
    viewHref: "/rcm",
    viewLabel: "View reverse charge",
  },
  {
    step: 5,
    kind: "compliance",
    action: uploadComplianceCsv,
    parse: parseComplianceCsv,
    title: "Compliance deadlines",
    purpose: "Your filing calendar (GST, TDS, PF, ROC) with an evidence reference.",
    needs: "Each filing's name, the authority, the period and the due date. Optionally the date you filed it and a proof reference such as an ARN.",
    viewHref: "/compliance",
    viewLabel: "View compliance",
  },
];

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-[background-color,filter,transform] duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 disabled:active:scale-100";
const BTN_SOLID = "bg-accent text-accent-fg hover:brightness-110";
const BTN_GHOST = "border border-border-strong text-fg hover:bg-surface-2";
const BTN_DANGER = "border border-danger/40 text-danger hover:bg-danger-soft";

function SubmitButton({
  children,
  variant = "solid",
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  variant?: "solid" | "ghost" | "danger";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const { pending } = useFormStatus();
  const styles =
    variant === "solid" ? BTN_SOLID : variant === "danger" ? BTN_DANGER : BTN_GHOST;
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      onClick={onClick}
      className={`${BTN_BASE} ${styles}`}
    >
      {pending ? "Importing…" : children}
    </button>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

// Preview of exactly what will be written, shown BEFORE anything touches the DB.
function PreviewPanel({
  preview,
  warnings,
  fileName,
  onConfirm,
  onCancel,
  onBack,
}: {
  preview: ParseResult<unknown>;
  warnings: HealthWarning[];
  fileName: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  onBack?: () => void;
}) {
  const rows = preview.valid as Record<string, unknown>[];
  const errors = preview.errors;
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
  const sample = rows.slice(0, 5);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-strong bg-surface-2/60 p-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="truncate text-[12.5px] font-medium text-fg" title={fileName ?? ""}>
          {fileName}
        </span>
        <span className="text-[12.5px] font-semibold text-success">
          {rows.length} row{rows.length === 1 ? "" : "s"} ready
        </span>
        {errors.length > 0 && (
          <span className="text-[12.5px] font-semibold text-warning">
            {errors.length} will be skipped
          </span>
        )}
      </div>

      {cols.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-border">
                {cols.map((c) => (
                  <th
                    key={c}
                    className="px-2 py-1.5 font-mono font-medium whitespace-nowrap text-faint"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sample.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {cols.map((c) => (
                    <td
                      key={c}
                      className="px-2 py-1.5 whitespace-nowrap text-muted"
                    >
                      {formatCell(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > sample.length && (
            <p className="px-2 py-1.5 text-[11px] text-faint">
              …and {rows.length - sample.length} more valid row(s).
            </p>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <div className="rounded-lg bg-warning-soft px-3 py-2 text-[12px] text-warning">
          <p className="font-medium">These rows have errors and will be skipped:</p>
          <ul className="mt-1 list-inside list-disc text-[11.5px]">
            {errors.slice(0, 5).map((e, i) => (
              <li key={i}>
                {e.row > 0 ? `Row ${e.row}: ` : ""}
                {e.message}
              </li>
            ))}
            {errors.length > 5 && <li>…and {errors.length - 5} more</li>}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg bg-info-soft px-3 py-2 text-[12px] text-info">
          <p className="font-medium">
            {warnings.length} row{warnings.length === 1 ? "" : "s"} will import,
            but worth a double-check:
          </p>
          <ul className="mt-1 list-inside list-disc text-[11.5px]">
            {warnings.slice(0, 5).map((w, i) => (
              <li key={i}>
                <span className="font-medium">{w.label}</span>: {w.message}
              </li>
            ))}
            {warnings.length > 5 && <li>…and {warnings.length - 5} more</li>}
          </ul>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-[12.5px] text-danger">
          Nothing to import. Fix the errors above and choose the file again.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton variant="solid" disabled={rows.length === 0} onClick={onConfirm}>
          Confirm import ({rows.length})
        </SubmitButton>
        {onBack && (
          <button type="button" onClick={onBack} className={`${BTN_BASE} ${BTN_GHOST}`}>
            Back to column matching
          </button>
        )}
        <button type="button" onClick={onCancel} className={`${BTN_BASE} ${BTN_GHOST}`}>
          Choose a different file
        </button>
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  card,
  onReset,
}: {
  result: UploadResult;
  card: CardConfig;
  onReset: () => void;
}) {
  const tone = result.ok
    ? "bg-success-soft text-success"
    : result.inserted > 0
      ? "bg-warning-soft text-warning"
      : "bg-danger-soft text-danger";
  return (
    <div className={`flex flex-col gap-2 rounded-xl px-3.5 py-3 text-[13px] ${tone}`}>
      <p className="font-semibold">{result.message}</p>
      {result.errors.length > 0 && (
        <ul className="list-inside list-disc text-[11.5px] text-muted">
          {result.errors.slice(0, 4).map((e, i) => (
            <li key={i}>
              {e.row > 0 ? `Row ${e.row}: ` : ""}
              {e.message}
            </li>
          ))}
          {result.errors.length > 4 && (
            <li>…and {result.errors.length - 4} more</li>
          )}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3 pt-0.5">
        {result.inserted > 0 && (
          <Link
            href={card.viewHref}
            className="text-xs font-semibold text-accent-text hover:opacity-80"
          >
            {card.viewLabel} →
          </Link>
        )}
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-medium text-muted hover:text-fg"
        >
          Import another file
        </button>
      </div>
    </div>
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Advisory data-health checks, keyed by the card's parser identity — deterministic,
// runs client-side on the already-parsed rows, nothing leaves the browser.
const HEALTH_BY_PARSER = new Map<
  CsvParser,
  (rows: unknown[], asOf: string) => HealthWarning[]
>([
  [parseVendorsCsv, (r) => checkVendorsHealth(r as VendorInput[])],
  [parseBillsCsv, (r, a) => checkBillsHealth(r as BillInput[], a)],
  [parseImsCsv, (r) => checkImsHealth(r as ImsInvoiceInput[])],
  [parseRcmCsv, (r, a) => checkRcmHealth(r as RcmPurchaseInput[], a)],
  [parseComplianceCsv, (r, a) => checkComplianceHealth(r as ComplianceDeadlineInput[], a)],
]);

// Put a canonical CSV (headers = the app's field keys) into the form's file
// input, so the confirm submit sends clean mapped data that the server's
// existing validator independently re-checks — the mapping is a client
// convenience, the server still validates every value.
function setInputToCsv(input: HTMLInputElement, name: string, csv: string): void {
  const file = new File([csv], name, { type: "text/csv" });
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
}

// Column-matching step: shows which of the user's columns feeds each app field,
// pre-filled by auto-detection. The user fixes any wrong guess, then continues.
// Nothing is validated or saved from here — that happens after the preview.
function MappingPanel({
  fields,
  headers,
  sampleRow,
  mapping,
  onChange,
  onContinue,
  onCancel,
  unmappedRequired,
  aiFilled,
  isAiBusy,
}: {
  fields: TargetField[];
  headers: string[];
  sampleRow: Record<string, string> | undefined;
  mapping: Record<string, string | null>;
  onChange: (fieldKey: string, header: string | null) => void;
  onContinue: () => void;
  onCancel: () => void;
  unmappedRequired: string[];
  aiFilled: string[];
  isAiBusy: boolean;
}) {
  const isBlocked = unmappedRequired.length > 0;
  const aiFilledSet = new Set(aiFilled);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-strong bg-surface-2/60 p-3.5">
      <div>
        <p className="text-[12.5px] font-semibold text-fg">Match your columns</p>
        <p className="mt-0.5 text-[11.5px] text-muted">
          We guessed which of your columns feeds each field. Fix any that look
          wrong, then continue. Nothing is saved yet.
        </p>
        {isAiBusy && (
          <p className="mt-1 text-[11.5px] text-accent-text">
            Asking AI to fill the gaps… (you can start matching now)
          </p>
        )}
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {fields.map((f) => {
          const selected = mapping[f.key] ?? "";
          const sampleVal = selected && sampleRow ? sampleRow[selected] ?? "" : "";
          const isMissing = f.required && selected === "";
          return (
            <div key={f.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
              <label className="min-w-[8.5rem] flex-1 text-[12.5px] font-medium text-fg">
                {f.label}
                {f.required && <span className="ml-0.5 text-danger">*</span>}
                {aiFilledSet.has(f.key) && (
                  <span
                    className="ml-1.5 rounded bg-accent-soft px-1 py-0.5 text-[9.5px] font-semibold tracking-wide text-accent-text uppercase"
                    title="Suggested by AI, please check this one"
                  >
                    AI
                  </span>
                )}
              </label>
              <select
                value={selected}
                onChange={(e) =>
                  onChange(f.key, e.target.value === "" ? null : e.target.value)
                }
                className={`min-w-[10rem] flex-1 rounded-lg border bg-surface px-2 py-1.5 text-[12px] text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                  isMissing ? "border-danger/60" : "border-border-strong"
                }`}
              >
                <option value="">{f.required ? "Pick a column…" : "Skip this field"}</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span
                className="min-w-[5rem] flex-1 truncate text-[11px] text-faint"
                title={sampleVal}
              >
                {sampleVal ? `e.g. ${sampleVal}` : ""}
              </span>
            </div>
          );
        })}
      </div>

      {isBlocked && (
        <div className="rounded-lg bg-warning-soft px-3 py-2 text-[11.5px] text-warning">
          Pick a column for every required field (marked{" "}
          <span className="text-danger">*</span>) to continue.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isBlocked}
          onClick={onContinue}
          className={`${BTN_BASE} ${BTN_SOLID}`}
        >
          Continue to preview
        </button>
        <button type="button" onClick={onCancel} className={`${BTN_BASE} ${BTN_GHOST}`}>
          Choose a different file
        </button>
      </div>
    </div>
  );
}

type RawTable = { headers: string[]; rows: Record<string, string>[] };

// Whether to consult the optional AI mapping layer at all. Non-secret, so it can
// be a public flag: with it off (the default) the client never calls the AI
// action, so imports behave exactly as the deterministic-only flow — no round
// trip, no "asking AI" hint. The server independently re-checks that a key is
// actually configured, so this flag can never force AI on by itself.
const IS_AI_MAPPING_ENABLED = process.env.NEXT_PUBLIC_AI_MAPPING_ENABLED === "1";

// Plural-aware label for what a card already holds, e.g. "12 vendors added".
function addedLabel(kind: ImportKind, count: number): string {
  const noun: Record<ImportKind, [string, string]> = {
    vendors: ["vendor", "vendors"],
    bills: ["bill", "bills"],
    ims: ["IMS invoice", "IMS invoices"],
    rcm: ["reverse-charge purchase", "reverse-charge purchases"],
    compliance: ["deadline", "deadlines"],
  };
  const [one, many] = noun[kind];
  return `${count} ${count === 1 ? one : many} added`;
}

// Overall setup progress, so the page answers "how far am I?" at a glance.
function SetupProgress({ progress }: { progress: ImportProgress }) {
  const { addedCount, total, fraction, allDone } = progress;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[13px] font-semibold text-fg">
          {allDone ? "All set up" : "Your setup"}
        </p>
        <p className="tnum font-mono text-[12.5px] font-semibold text-accent-text">
          {addedCount} of {total} added
        </p>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface"
        role="progressbar"
        aria-valuenow={addedCount}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Data types added"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${Math.round(fraction * 100)}%` }}
        />
      </div>
      <p className="text-[11.5px] text-muted">
        {allDone
          ? "Every data type has something in it. Re-upload any file to update it."
          : "Start with bills to see money at risk fastest. We add any supplier we have not seen, so you can upload in any order."}
      </p>
    </div>
  );
}

function UploadCard({ card, status }: { card: CardConfig; status: ImportKindStatus }) {
  const fields = FIELD_SPECS[card.kind];
  const [result, formAction, isPending] = useActionState(card.action, null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [raw, setRaw] = useState<RawTable | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null> | null>(null);
  const [preview, setPreview] = useState<ParseResult<unknown> | null>(null);
  const [stage, setStage] = useState<"drop" | "mapping" | "preview">("drop");
  const [dragOver, setDragOver] = useState(false);
  const [aiFilled, setAiFilled] = useState<string[]>([]);
  const [isAiBusy, setIsAiBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Guards for the async AI pre-fill: never apply a reply for a superseded file,
  // and never overwrite a mapping the user has already touched.
  const requestIdRef = useRef(0);
  const userEditedRef = useRef(false);
  const inputId = `import-file-${card.step}`;

  async function acceptFile(file: File | undefined) {
    if (!file) return;
    const requestId = ++requestIdRef.current;
    userEditedRef.current = false;
    setFileName(file.name);
    setSubmittedName(null); // invalidate any previous result
    setReadError(null);
    setPreview(null);
    setAiFilled([]);
    try {
      // Normalize any file type (CSV/TSV/Excel/ODS) to CSV text, then parse to
      // rows keyed by the file's OWN headers — any names, any order.
      const read = await fileToCsv(file);
      if (!read.ok) {
        setReadError(read.message);
        return;
      }
      const parsed = Papa.parse<Record<string, string>>(read.csv, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (h) => h.trim(),
      });
      const headers = (parsed.meta.fields ?? []).filter((h) => h !== "");
      const rows = parsed.data;
      if (headers.length === 0 || rows.length === 0) {
        setReadError("No rows found. Check the file has a header row with data below it.");
        return;
      }
      // Deterministic matching first — this is the floor, and it needs no AI.
      const detected = suggestMapping(headers, fields).mapping;
      setRaw({ headers, rows });
      setMapping(detected);
      setStage("mapping");

      // Optional AI pass fills only what detection missed. Skipped entirely when
      // disabled, so the default path makes no extra request at all; any failure
      // leaves the deterministic mapping exactly as-is.
      if (!IS_AI_MAPPING_ENABLED) return;
      setIsAiBusy(true);
      try {
        const proposal = await suggestMappingWithAi(card.kind, headers, rows.slice(0, 2));
        const isStale = requestId !== requestIdRef.current || userEditedRef.current;
        if (!isStale && proposal.mapping) {
          const merged = mergeAiProposal(detected, proposal.mapping, fields);
          setMapping(merged.mapping);
          setAiFilled(merged.aiFilled);
        }
      } catch {
        // AI is best-effort; the deterministic mapping stands.
      } finally {
        if (requestId === requestIdRef.current) setIsAiBusy(false);
      }
    } catch {
      setReadError("Could not read this file.");
    }
  }

  function changeMapping(fieldKey: string, header: string | null) {
    userEditedRef.current = true;
    setMapping((prev) => {
      const next = { ...(prev ?? {}) };
      // A source column feeds only one field — clear it from any other field first.
      if (header) {
        for (const k of Object.keys(next)) if (next[k] === header) next[k] = null;
      }
      next[fieldKey] = header;
      return next;
    });
  }

  function continueToPreview() {
    if (!raw || !mapping || !inputRef.current) return;
    const canonicalRows = applyMapping(raw.rows, mapping, fields);
    const csv = toCanonicalCsv(canonicalRows, fields);
    setInputToCsv(inputRef.current, `${card.kind}-mapped.csv`, csv);
    setPreview(card.parse(csv));
    setStage("preview");
  }

  function reset() {
    requestIdRef.current += 1; // discard any AI reply still in flight
    userEditedRef.current = false;
    setStage("drop");
    setReadError(null);
    setRaw(null);
    setMapping(null);
    setPreview(null);
    setFileName(null);
    setSubmittedName(null);
    setAiFilled([]);
    setIsAiBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  const unmappedRequired = mapping
    ? fields.filter((f) => f.required && !mapping[f.key]).map((f) => f.key)
    : [];

  // `result` is inlined (not hoisted to a bool) so TS narrows it to non-null below.
  const committed = !isPending && submittedName !== null && submittedName === fileName;

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
          <h3 className="font-display text-[15px] font-semibold text-fg">{card.title}</h3>
          <p className="mt-0.5 text-[13px] text-muted">{card.purpose}</p>
        </div>
        {status.isAdded && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {addedLabel(card.kind, status.count)}
          </span>
        )}
      </div>

      <p className="text-[11.5px] leading-relaxed text-faint">
        <span className="font-medium text-muted">What we need:</span> {card.needs}
      </p>
      {card.note && (
        <p className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11.5px] text-muted">{card.note}</p>
      )}

      {/* Always mounted so the file stays in the form between preview and confirm.
          The drop-zone label targets it via htmlFor. */}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        name="file"
        accept=".csv,.tsv,.xlsx,.xls,.ods,text/csv,text/tab-separated-values,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet"
        required
        onChange={(e) => acceptFile(e.target.files?.[0])}
        className="sr-only"
      />

      {committed && result !== null ? (
        <ResultPanel result={result} card={card} onReset={reset} />
      ) : stage === "preview" && preview ? (
        <PreviewPanel
          preview={preview}
          warnings={HEALTH_BY_PARSER.get(card.parse)?.(preview.valid, todayIso()) ?? []}
          fileName={fileName}
          onConfirm={() => setSubmittedName(fileName)}
          onCancel={reset}
          onBack={() => setStage("mapping")}
        />
      ) : stage === "mapping" && raw && mapping ? (
        <MappingPanel
          fields={fields}
          headers={raw.headers}
          sampleRow={raw.rows[0]}
          mapping={mapping}
          onChange={changeMapping}
          onContinue={continueToPreview}
          onCancel={reset}
          unmappedRequired={unmappedRequired}
          aiFilled={aiFilled}
          isAiBusy={isAiBusy}
        />
      ) : (
        <>
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void acceptFile(e.dataTransfer.files?.[0]);
            }}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
              dragOver ? "border-accent bg-accent-soft" : "border-border-strong hover:bg-surface-2"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="size-5 text-faint" aria-hidden>
              <path d="M12 16V4m0 0L8 8m4-4 4 4" />
              <path d="M4 20h16" />
            </svg>
            <span className="text-[13px] font-medium text-fg">Drop your file here, or click to browse</span>
            <span className="text-[11px] text-faint">Any layout works. CSV or Excel (.csv, .xlsx, .xls, .ods), and we match your columns next.</span>
          </label>
          {readError && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-[12px] text-danger">{readError}</p>
          )}
        </>
      )}
    </form>
  );
}

function HowItWorks() {
  const steps = [
    {
      t: "1 · You add your data",
      d: "Upload a CSV or Excel export straight from any software (Tally, Zoho, your billing system), with any column names in any order. No template to fill in.",
    },
    {
      t: "2 · We match your columns, you confirm",
      d: "We auto-detect which of your columns is which; you fix anything that looks off, then preview exactly what will be imported. Nothing is saved until you confirm.",
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
        <span className="font-semibold text-fg">Does an AI see my data?</span> Only to suggest
        column matches, and only that far: when you upload, your column names and up to two sample
        rows may be sent to an AI so it can propose which column is which. It only suggests. Nothing
        is calculated or saved until you review and confirm, and anything it gets wrong you simply
        change. Every money figure is computed by fixed, published tax rules, never by an AI, so each
        one still traces back to a rule and a legal section you (or your CA) can check. Your files
        are stored privately and are never used to train anything.
      </div>
    </section>
  );
}

function ClearDataControl() {
  const [armed, setArmed] = useState(false);

  // The <form> stays mounted so the submit-in-flight completes even as we
  // collapse back to the single button (resetting `armed`) on confirm.
  return (
    <form action={clearData} className="flex flex-wrap items-center gap-2">
      {armed ? (
        <>
          <span className="text-[12.5px] font-medium text-fg">
            Delete everything you&apos;ve imported?
          </span>
          <SubmitButton variant="danger" onClick={() => setArmed(false)}>
            Yes, clear it all
          </SubmitButton>
          <button
            type="button"
            onClick={() => setArmed(false)}
            className={`${BTN_BASE} ${BTN_GHOST}`}
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className={`${BTN_BASE} ${BTN_DANGER}`}
        >
          Clear all my data
        </button>
      )}
    </form>
  );
}

export function ImportPortal({ progress }: { progress: ImportProgress }) {
  return (
    <div className="flex flex-col gap-6">
      <HowItWorks />


      <div>
        <h2 className="mb-1 font-display text-base font-semibold text-fg">Or upload your own</h2>
        <p className="mb-4 text-[13px] text-muted">
          Upload each file in any layout. We match your columns, show you a preview, and save
          nothing until you confirm.
        </p>
        <div className="mb-4">
          <SetupProgress progress={progress} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {CARDS.map((card) => (
            <UploadCard key={card.title} card={card} status={progress.byKind[card.kind]} />
          ))}
        </div>
      </div>

      {progress.addedCount > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-5">
          <div>
            <h2 className="font-display text-[15px] font-semibold text-fg">Start over</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              Deletes everything you have imported. Your account and settings stay.
            </p>
          </div>
          <ClearDataControl />
        </section>
      )}
    </div>
  );
}
