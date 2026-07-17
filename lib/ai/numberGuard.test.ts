import { describe, it, expect } from "vitest";
import {
  collectAllowedNumbers,
  extractNumbers,
  findUnsupportedNumbers,
  isBriefNumericallyFaithful,
} from "./numberGuard";

describe("extractNumbers", () => {
  it("reads Indian digit grouping off a rupee figure", () => {
    expect(extractNumbers("₹1,42,500")).toEqual([142500]);
  });

  it("reads paise", () => {
    expect(extractNumbers("₹1,42,500.75")).toEqual([142500.75]);
  });

  it("pulls the numbers out of rule names and day counts", () => {
    // "GSTR-2B" and "45-day" are legitimate prose, and their digits must be
    // accounted for or the guard would reject honest sentences.
    expect(extractNumbers("GSTR-2B cutoff, 45-day MSME window, 8 days late")).toEqual([
      2, 45, 8,
    ]);
  });

  it("does not treat a sentence comma as part of the figure", () => {
    expect(extractNumbers("₹5,000, and then ₹200")).toEqual([5000, 200]);
  });

  it("finds nothing in prose with no numbers", () => {
    expect(extractNumbers("Pay this vendor before the others.")).toEqual([]);
  });
});

describe("collectAllowedNumbers", () => {
  it("reads numbers out of values, whatever the shape", () => {
    const facts = {
      totalAtRisk: "₹2,10,000",
      overdue: 2,
      items: [{ amount: "₹5,000" }, { amount: "₹300" }],
    };
    expect(collectAllowedNumbers(facts).sort((a, b) => a - b)).toEqual([
      2, 300, 5000, 210000,
    ]);
  });

  it("ignores digits in key names", () => {
    // The flaw this exists to prevent: a key like `next7` is a code identifier,
    // not a computed figure, and must not license the model to write "7".
    expect(collectAllowedNumbers({ next7: 4, next30: 1 }).sort((a, b) => a - b)).toEqual([
      1, 4,
    ]);
  });

  it("puts a window's own digits in the set when the label is a value", () => {
    // Which is why the facts carry human labels: "Next 7 days" earns its 7.
    expect(collectAllowedNumbers({ window: "Next 7 days", count: 4 })).toContain(7);
  });

  it("survives null and undefined values", () => {
    expect(collectAllowedNumbers({ amount: null, note: undefined, n: 5 })).toEqual([5]);
  });
});

describe("findUnsupportedNumbers", () => {
  const allowed = [142500, 8];

  it("passes a brief that only restates the figures it was given", () => {
    const brief = "Sri Krishna Traders is 8 days past the window. ₹1,42,500 is at risk.";
    expect(findUnsupportedNumbers(brief, allowed)).toEqual([]);
  });

  it("catches a miscopied rupee figure", () => {
    // The exact failure this guard exists for: a digit dropped from the amount.
    expect(findUnsupportedNumbers("₹14,250 is at risk.", allowed)).toEqual([14250]);
  });

  it("catches a figure the model computed for itself", () => {
    // Arithmetic is the rule engine's job. 142500 * 0.18 was never supplied.
    const brief = "That is ₹1,42,500 plus ₹25,650 of interest.";
    expect(findUnsupportedNumbers(brief, allowed)).toEqual([25650]);
  });

  it("catches an invented day count", () => {
    expect(findUnsupportedNumbers("You have 12 days left.", allowed)).toEqual([12]);
  });

  it("reports each unsupported number once", () => {
    expect(findUnsupportedNumbers("₹99 here and ₹99 there.", allowed)).toEqual([99]);
  });

  it("accepts prose with no numbers at all", () => {
    expect(findUnsupportedNumbers("Pay this vendor first.", allowed)).toEqual([]);
  });
});

describe("isBriefNumericallyFaithful", () => {
  const facts = { totalAtRisk: "₹2,10,000", overdue: 2, dueThisWeek: 4 };

  it("accepts a faithful brief", () => {
    const brief = "₹2,10,000 is exposed: 2 items are overdue and 4 land within the week.";
    expect(isBriefNumericallyFaithful(brief, facts)).toBe(true);
  });

  it("rejects the whole brief when a single figure is wrong", () => {
    // One bad number condemns the lot: a brief with a hole cut out reads as
    // broken, and carelessness with one figure impugns the rest.
    const brief = "₹2,10,000 is exposed: 2 overdue, 4 this week, 7 next month.";
    expect(isBriefNumericallyFaithful(brief, facts)).toBe(false);
  });

  it("rejects a rounded restatement of a real figure", () => {
    // "about ₹2 lakh" would be defensible from a human, but 200000 is not the
    // figure supplied, and allowing rounding opens drift we cannot bound.
    expect(isBriefNumericallyFaithful("Roughly ₹200000 is exposed.", facts)).toBe(false);
  });
});
