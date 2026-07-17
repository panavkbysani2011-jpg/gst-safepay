"use server";

import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { FIELD_SPECS, type ImportKind } from "@/lib/csv/fieldMapping";
import { isAiMappingConfigured, proposeMapping } from "@/lib/csv/aiMapping";

const MAX_HEADERS = 120;
const MAX_SAMPLE_ROWS = 2;

function isImportKind(value: string): value is ImportKind {
  return Object.prototype.hasOwnProperty.call(FIELD_SPECS, value);
}

/**
 * Ask the optional AI layer to propose a column mapping for an upload.
 *
 * Returns `{ mapping: null }` whenever AI is unavailable (no key), throttled, or
 * unusable — the client then keeps its deterministic mapping, so the import
 * works identically with the AI switched off. The proposal is only ever a
 * suggestion: the user reviews it and confirms before anything is validated or
 * saved, and no figure is ever computed by the model.
 */
export async function suggestMappingWithAi(
  kind: string,
  headers: string[],
  sampleRows: Record<string, string>[]
): Promise<{ mapping: Record<string, string | null> | null }> {
  // Cheap no-op first: when no key is configured this does nothing at all, so it
  // must not authenticate (and thus must not redirect a caller) just to say "off".
  if (!isAiMappingConfigured()) return { mapping: null };

  // Server actions are public endpoints: authenticate and validate everything.
  const user = await requireUser();
  if (!isImportKind(kind)) return { mapping: null };
  if (!Array.isArray(headers) || headers.length === 0 || headers.length > MAX_HEADERS) {
    return { mapping: null };
  }
  if (!headers.every((h) => typeof h === "string")) return { mapping: null };

  // Each call costs money upstream — throttle per user.
  const limited = await rateLimit(`aimap:${user.id}`, 40, 600);
  if (!limited.ok) return { mapping: null };

  const safeRows = (Array.isArray(sampleRows) ? sampleRows : []).slice(0, MAX_SAMPLE_ROWS);
  const mapping = await proposeMapping(headers, safeRows, FIELD_SPECS[kind]);
  return { mapping };
}
