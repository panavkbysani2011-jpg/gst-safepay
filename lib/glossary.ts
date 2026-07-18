// Plain-English explanations for the tax jargon this tool unavoidably uses.
//
// The terms themselves stay: a chartered accountant needs "GSTR-2B", and using
// the real words is part of the tool's credibility. What was missing is a plain
// line beside them, because the person actually running the business is usually
// not an accountant and will bounce off a screen full of section numbers.
//
// Rules for these lines: no other jargon inside the explanation, no section
// numbers unless the term IS a section number, and say what it means for the
// reader's money wherever that is the honest point.

export interface GlossaryEntry {
  /** The term as it appears on screen. */
  term: string;
  /** One plain sentence. No jargon inside the explanation. */
  plain: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  gstin: {
    term: "GSTIN",
    plain: "The 15-character GST number that identifies a business. If a supplier's is wrong or inactive, you can lose the tax credit on their bills.",
  },
  gstr2b: {
    term: "GSTR-2B",
    plain: "The monthly statement the GST portal generates listing the tax credit you are allowed to claim. It is locked once generated.",
  },
  gstr3b: {
    term: "GSTR-3B",
    plain: "The monthly GST return where you declare what you owe and pay it.",
  },
  ims: {
    term: "IMS",
    plain: "The GST portal screen where you accept or reject each supplier invoice before it flows into your monthly statement.",
  },
  itc: {
    term: "Input tax credit (ITC)",
    plain: "The GST you already paid your suppliers, which you subtract from the GST you owe. Losing it means paying that amount again out of pocket.",
  },
  deemedAccepted: {
    term: "Deemed accepted",
    plain: "If you do not accept or reject a supplier's invoice before the cutoff, the portal treats it as accepted for you, whether or not it was correct.",
  },
  rcm: {
    term: "Reverse charge",
    plain: "Cases where you pay the GST to the government yourself instead of paying it to your supplier.",
  },
  selfInvoice: {
    term: "Self-invoice",
    plain: "A bill you raise to yourself when you buy from an unregistered supplier, because they cannot issue a GST bill. Missing it carries a penalty.",
  },
  rule47a: {
    term: "Rule 47A",
    plain: "The rule setting how many days you have to raise that self-invoice.",
  },
  msme: {
    term: "MSME / Udyam",
    plain: "A government registration for micro, small and medium businesses. Suppliers who hold it must be paid within a strict deadline.",
  },
  msmed: {
    term: "MSMED Act",
    plain: "The law that sets the payment deadline for registered small suppliers, and the interest you owe if you miss it.",
  },
  section43b: {
    term: "Section 43B(h)",
    plain: "An income-tax rule: pay a registered small supplier late and you cannot deduct that expense until you actually pay, so your tax bill rises this year.",
  },
  timeOfSupply: {
    term: "Time of supply",
    plain: "The date the tax officially becomes due, which is not always the date on the bill.",
  },
  taxableValue: {
    term: "Taxable value",
    plain: "The price of the goods or services before GST is added.",
  },
  arn: {
    term: "ARN",
    plain: "The acknowledgement number the portal gives you after a filing. It is your proof you filed.",
  },
  cutoff: {
    term: "Cutoff",
    plain: "The last date to act before the portal decides for you.",
  },
};

export type GlossaryKey = keyof typeof GLOSSARY;

/** Look up an entry, or null when the key is unknown (never throws in render). */
export function glossaryEntry(key: string): GlossaryEntry | null {
  return GLOSSARY[key] ?? null;
}

/** Every entry, stable-sorted by term, for a full glossary listing. */
export function allGlossaryEntries(): GlossaryEntry[] {
  return Object.values(GLOSSARY).sort((a, b) => a.term.localeCompare(b.term));
}
