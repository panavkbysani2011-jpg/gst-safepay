// SERVER-ONLY. The optional "explain it in plain English" layer.
//
// What it does: takes figures the deterministic rule engines have ALREADY
// computed and asks a model to turn them into a short plain-language brief for
// someone who is not an accountant. What it does not do: arithmetic, rule
// interpretation, validation, or writing anything to the database.
//
// The division of labour is the whole point. The engine is good at rules and
// exact money and is testable; a model is good at prose and is not testable. So
// the model never touches a number. Three separate mechanisms hold that line:
//
//  1. The figures are computed and frozen before the model is called at all.
//  2. Vendor names never leave this server. The facts use pseudonyms ("V1") and
//     the real names are substituted back in locally, after the reply lands.
//  3. Every number the model writes is checked against the numbers it was given
//     (see numberGuard). One unsupported figure and the brief is discarded.
//
// Best-effort by construction: no key, a timeout, an HTTP error, junk output or
// a failed guard all return null, and the page simply renders without it. The
// deterministic numbers are already on screen; this was only ever an extra.
import type { OverviewModel } from "@/lib/data/overview";
import type { DeadlineBucket, UpcomingDeadline } from "@/lib/data/deadlines";
import { formatINR } from "@/lib/format";
import { collectAllowedNumbers, findUnsupportedNumbers } from "./numberGuard";

const DEFAULT_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "moonshotai/kimi-k2.6";
// Kimi K2 and similarly large models on NVIDIA's shared endpoint can take 15-30s
// to respond. The brief streams behind Suspense so this never blocks the rest of
// the dashboard; a generous cap just lets a slow model finish instead of aborting.
const TIMEOUT_MS = 35_000;
/** Enough to characterise the situation; more is just cost and exposure. */
const MAX_ITEMS = 5;
const MAX_BRIEF_CHARS = 700;

export interface BriefFacts {
  totalAtRisk: string;
  windows: { window: string; count: number; amount: string }[];
  items: { ref: string; obligation: string; timing: string; amount: string | null }[];
}

/** Pseudonym -> real vendor name. Never sent anywhere; used to restore the prose. */
export type NameMap = Map<string, string>;

/** True when an API key is configured; otherwise this layer stays off entirely. */
export function isBriefConfigured(): boolean {
  return Boolean(process.env.NVIDIA_API_KEY);
}

/**
 * Reduce the computed dashboard into the small set of facts the model may see.
 *
 * Every value is a preformatted label or an already-computed figure, so the
 * model has nothing left to calculate. Vendor names are replaced with refs here,
 * at the boundary, so there is no path by which a customer's counterparty list
 * reaches a third-party endpoint.
 */
export function buildBriefFacts(
  overview: OverviewModel,
  buckets: DeadlineBucket[],
  deadlines: UpcomingDeadline[]
): { facts: BriefFacts; names: NameMap } {
  const names: NameMap = new Map();

  const items = deadlines.slice(0, MAX_ITEMS).map((d, i) => {
    const ref = `V${i + 1}`;
    names.set(ref, d.title);
    return {
      ref,
      obligation: d.what,
      timing:
        d.daysToDue < 0
          ? `overdue by ${Math.abs(d.daysToDue)} days`
          : d.daysToDue === 0
            ? "due today"
            : `due in ${d.daysToDue} days`,
      amount: d.amount !== null && d.amount > 0 ? formatINR(d.amount) : null,
    };
  });

  return {
    facts: {
      totalAtRisk: formatINR(overview.totalAtRisk),
      windows: buckets
        .filter((b) => b.count > 0)
        .map((b) => ({
          window: b.label,
          count: b.count,
          amount: formatINR(b.amount),
        })),
      items,
    },
    names,
  };
}

function buildPrompt(facts: BriefFacts): string {
  return [
    "You explain a small Indian business's tax and payment deadlines to the owner,",
    "who is not an accountant. Below are figures that have ALREADY been calculated",
    "by a rule engine. Your job is only to explain them in plain English.",
    "",
    "FACTS:",
    JSON.stringify(facts, null, 2),
    "",
    "Write 2 or 3 short sentences that tell the owner what to deal with first and why",
    "it matters in practical terms (money lost, credit lost, interest accruing).",
    "",
    "HARD RULES:",
    "- NEVER write a number that does not appear verbatim in FACTS. Do not add,",
    "  total, convert, round or estimate. If you want a figure, copy it exactly.",
    "- Refer to a party only by its ref (V1, V2). Do not invent names.",
    "- No greetings, no headings, no bullet points, no markdown. Plain sentences.",
    "- Do not give tax advice or tell them what is legally required. Describe the",
    "  situation and the consequence, and leave the judgement to them and their CA.",
    "- Do not use em dashes.",
    "",
    "Reply with the sentences and nothing else.",
  ].join("\n");
}

/** Put the real vendor names back, once the reply has cleared the guard. */
function restoreNames(text: string, names: NameMap): string {
  let out = text;
  for (const [ref, name] of names) {
    out = out.replace(new RegExp(`\\b${ref}\\b`, "g"), name);
  }
  return out;
}

/**
 * Ask the configured model for a plain-language brief over already-computed
 * figures. Returns null whenever anything is off, and callers must treat null as
 * "render the page without a brief".
 */
export async function generateBrief(
  facts: BriefFacts,
  names: NameMap
): Promise<string | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;
  if (facts.items.length === 0) return null;

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
        messages: [{ role: "user", content: buildPrompt(facts) }],
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

    const brief = text.trim();
    if (brief.length === 0 || brief.length > MAX_BRIEF_CHARS) return null;

    // The load-bearing check: refuse anything numerically unfaithful to the facts.
    const unsupported = findUnsupportedNumbers(brief, collectAllowedNumbers(facts));
    if (unsupported.length > 0) return null;

    return restoreNames(brief, names);
  } catch {
    // Timeout, network error, bad JSON: the page renders without a brief.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
