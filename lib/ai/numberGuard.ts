// The guard that makes the AI brief safe to show next to real money.
//
// The rule this enforces: THE MODEL MAY NOT EMIT A NUMBER IT WAS NOT GIVEN.
//
// Every figure in this tool is computed by the deterministic rule engines before
// the model sees anything. The model's only job is to put those figures into
// plain English. But a model asked to write prose about money will happily write
// a *slightly different* number: ₹14,250 for ₹1,42,500, "about 2 lakh" for
// ₹1,62,700, "12 days" for 8. Prose that misstates a rupee figure is worse than
// no prose, because it looks authoritative and sits under a heading the user
// trusts.
//
// So rather than trusting the model, we check it. We collect every number that
// appeared in the facts we handed it, collect every number in what it wrote, and
// reject the whole brief if it used one we never gave it. This is a mechanical
// check with no judgement in it, which is exactly why it is trustworthy: the
// model cannot argue its way past it, and it needs no maintenance as the facts
// change, because the allowed set is derived from the facts themselves.
//
// A rejected brief is not an error. It costs the user nothing: the deterministic
// numbers are already on screen, and the brief was only ever an extra.

/**
 * Every number-like token in a string, normalised to a plain number.
 *
 * Handles the shapes the facts and the prose actually use: "₹1,42,500" (Indian
 * digit grouping), "1,42,500.50", "8", "45-day", "GSTR-2B". Percent signs and
 * currency symbols are irrelevant here, since only the numeric value is compared.
 */
export function extractNumbers(text: string): number[] {
  const matches = text.match(/\d[\d,]*(?:\.\d+)?/g);
  if (matches === null) return [];

  const out: number[] = [];
  for (const raw of matches) {
    // Trailing commas are separators, not part of the figure ("₹5,000, and…").
    const cleaned = raw.replace(/,/g, "");
    const value = Number.parseFloat(cleaned);
    if (Number.isFinite(value)) out.push(value);
  }
  return out;
}

/**
 * Every number reachable in the VALUES of a facts object.
 *
 * Values only, never keys. A key is a code identifier that the rule engine never
 * computed: given `{ next7: 4 }`, the key would sneak 7 into the allowed set and
 * quietly license the model to write "7" for a figure nobody calculated. So the
 * facts handed to the model must carry their labels as values ("Next 7 days"),
 * which puts the legitimate 7 in the set for an honest reason and leaves the
 * guard tight everywhere else.
 */
export function collectAllowedNumbers(facts: unknown): number[] {
  const out: number[] = [];

  const walk = (node: unknown): void => {
    if (typeof node === "number") {
      if (Number.isFinite(node)) out.push(node);
      return;
    }
    if (typeof node === "string") {
      out.push(...extractNumbers(node));
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (node !== null && typeof node === "object") {
      for (const value of Object.values(node)) walk(value);
    }
  };

  walk(facts);
  return out;
}

/**
 * Numbers the model used that were not among the facts it was given.
 *
 * An empty array means every figure it wrote traces back to something the rule
 * engine computed. A non-empty array means it invented, miscopied or did
 * arithmetic, and the brief must be thrown away.
 */
export function findUnsupportedNumbers(brief: string, allowed: number[]): number[] {
  const permitted = new Set(allowed);
  const unsupported: number[] = [];
  for (const used of extractNumbers(brief)) {
    if (!permitted.has(used) && !unsupported.includes(used)) unsupported.push(used);
  }
  return unsupported;
}

/**
 * True when every number in the brief came from the facts.
 *
 * Deliberately strict: any unsupported figure rejects the entire brief rather
 * than the sentence containing it, because a brief with a hole cut out of it
 * reads as broken, and because one wrong figure is evidence the model was
 * careless with the rest.
 */
export function isBriefNumericallyFaithful(brief: string, facts: unknown): boolean {
  return findUnsupportedNumbers(brief, collectAllowedNumbers(facts)).length === 0;
}
