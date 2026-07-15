// Normalizes any supported upload to a CSV string, so the whole downstream
// pipeline (header check, per-row zod validation, data-health warnings) stays
// exactly as it was for CSV. Isomorphic: the same function runs client-side for
// the preview and server-side for the authoritative re-parse.
//
// Spreadsheets are converted with SheetJS's *formatted* cell text (not raw
// values), which means a date shown as "2026-06-15" comes through as that
// string and a date shown as "15/06/2026" comes through as that string — the
// downstream YYYY-MM-DD regex then rejects the wrong format with a clear error
// instead of silently misreading it. For a money/deadline tool, failing closed
// on an ambiguous date is the safe behaviour.

// 5 MB covers a 5000-row ledger comfortably while capping memory/DoS on a
// serverless function. Kept in step with the 5000-row limit in parseCsv.ts.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const TEXT_EXTENSIONS = new Set(["csv", "tsv", "txt"]);
const SPREADSHEET_EXTENSIONS = new Set([
  "xlsx",
  "xls",
  "xlsm",
  "xlsb",
  "ods",
  "fods",
]);

// A human list for error copy and the file picker's accept hint.
export const SUPPORTED_UPLOAD_EXTENSIONS = [
  "csv",
  "tsv",
  "xlsx",
  "xls",
  "ods",
] as const;

export type ToCsvResult =
  | { ok: true; csv: string }
  | { ok: false; message: string };

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

function megabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/**
 * Convert an uploaded file to CSV text, or return a user-facing reason it can't
 * be read. Enforces the size cap and the format allowlist up front — this runs
 * on the server as the real gate, and on the client for an instant preview.
 */
export async function fileToCsv(file: File): Promise<ToCsvResult> {
  if (file.size === 0) {
    return { ok: false, message: "That file is empty." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `That file is ${megabytes(file.size)} MB, over the ${megabytes(
        MAX_UPLOAD_BYTES
      )} MB limit. Split it into smaller files.`,
    };
  }

  const ext = extensionOf(file.name);

  // CSV/TSV/plain-text: hand the raw text straight to the parser, which
  // auto-detects the delimiter (comma or tab).
  if (TEXT_EXTENSIONS.has(ext) || ext === "") {
    return { ok: true, csv: await file.text() };
  }

  if (SPREADSHEET_EXTENSIONS.has(ext)) {
    try {
      // Loaded on demand so CSV-only users never download the spreadsheet
      // parser, and the base Import page stays light.
      const XLSX = await import("xlsx");
      const bytes = new Uint8Array(await file.arrayBuffer());
      // cellFormula/cellHTML off: we only want displayed values, and not
      // parsing formulas/HTML trims the attack surface on untrusted files.
      const workbook = XLSX.read(bytes, {
        type: "array",
        cellFormula: false,
        cellHTML: false,
      });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return { ok: false, message: "That spreadsheet has no sheets." };
      }
      const sheet = workbook.Sheets[firstSheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      return { ok: true, csv };
    } catch {
      return {
        ok: false,
        message:
          "Could not read that spreadsheet. Re-save it as .xlsx or .csv and try again.",
      };
    }
  }

  return {
    ok: false,
    message: `Unsupported file type ".${ext}". Upload one of: ${SUPPORTED_UPLOAD_EXTENSIONS.join(
      ", "
    )}.`,
  };
}
