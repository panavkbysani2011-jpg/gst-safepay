// SERVER-ONLY. Optional AI layer that *proposes* a column mapping for a messy
// upload. Never import this from a client component — it reads the API key.
//
// Safety posture, deliberately narrow:
//  - The AI only suggests which column feeds which field. It never computes a
//    figure, never validates, never writes. All money math stays in the
//    deterministic rule engine, and the user confirms before anything is saved.
//  - Its reply is untrusted text: parsed defensively and checked against the
//    file's real headers (see parseAiMappingResponse). Anything hallucinated or
//    malformed is dropped.
//  - Best-effort: no key, a timeout, an HTTP error, or junk output all return
//    null, and the caller falls back to the deterministic matcher.
//  - Privacy: only the column headers and a couple of truncated sample rows are
//    sent — never the whole file. Disclosed in the import page's copy.
import { parseAiMappingResponse, type TargetField } from "./fieldMapping";

const DEFAULT_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama-3.3-70b-instruct";
const TIMEOUT_MS = 12_000;
/** Only a taste of the data is needed to tell a date column from an amount. */
const MAX_SAMPLE_ROWS = 2;
const MAX_CELL_CHARS = 40;
const MAX_HEADERS = 120;

/** True when an API key is configured; otherwise the AI layer stays off entirely. */
export function isAiMappingConfigured(): boolean {
  return Boolean(process.env.NVIDIA_API_KEY);
}

function truncate(value: string): string {
  return value.length > MAX_CELL_CHARS ? `${value.slice(0, MAX_CELL_CHARS)}…` : value;
}

function buildPrompt(
  headers: string[],
  sampleRows: Record<string, string>[],
  fields: TargetField[]
): string {
  const fieldLines = fields
    .map(
      (f) =>
        `- "${f.key}" (${f.label}; type: ${f.type}${f.required ? "; REQUIRED" : ""})`
    )
    .join("\n");

  const samples = sampleRows.slice(0, MAX_SAMPLE_ROWS).map((row) => {
    const obj: Record<string, string> = {};
    for (const h of headers) obj[h] = truncate(String(row[h] ?? ""));
    return obj;
  });

  return [
    "You map spreadsheet columns onto a fixed set of fields for an Indian GST/accounting tool.",
    "",
    "TARGET FIELDS:",
    fieldLines,
    "",
    `SOURCE COLUMNS (use these EXACT strings, or null): ${JSON.stringify(headers)}`,
    "",
    "SAMPLE ROWS:",
    JSON.stringify(samples, null, 2),
    "",
    "Return ONLY a JSON object mapping each target field key to the exact source",
    "column name that feeds it, or null if no column fits. Rules:",
    '- Use only column names from SOURCE COLUMNS, character for character.',
    "- Never invent a column name.",
    "- Use null when unsure. A wrong guess is worse than null: a human reviews this.",
    "- Do not map one column to two different fields.",
    "- If an amount is only derivable by arithmetic (e.g. rate x quantity), return null for it.",
    "",
    'Example shape: {"id":"Bill No","amount":null}',
    "Reply with the JSON object and nothing else.",
  ].join("\n");
}

/**
 * Ask the configured model to propose a mapping. Returns a validated
 * {fieldKey: header|null} map, or null when unavailable/unusable — callers must
 * treat null as "just use the deterministic matcher".
 */
export async function proposeMapping(
  headers: string[],
  sampleRows: Record<string, string>[],
  fields: TargetField[]
): Promise<Record<string, string | null> | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;
  if (headers.length === 0 || headers.length > MAX_HEADERS) return null;

  const endpoint = process.env.AI_MAPPING_ENDPOINT ?? DEFAULT_ENDPOINT;
  const model = process.env.AI_MAPPING_MODEL ?? DEFAULT_MODEL;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: buildPrompt(headers, sampleRows, fields) }],
        // Deterministic-as-possible: this is structured extraction, not prose.
        temperature: 0,
        top_p: 1,
        max_tokens: 1024,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    const text = (data as { choices?: { message?: { content?: unknown } }[] })
      ?.choices?.[0]?.message?.content;
    if (typeof text !== "string") return null;
    return parseAiMappingResponse(text, headers, fields);
  } catch {
    // Timeout, network error, bad JSON — the deterministic mapping stands.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
