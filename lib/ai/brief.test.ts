import { describe, it, expect, vi, afterEach } from "vitest";
import { buildBriefFacts, generateBrief } from "./brief";
import { collectAllowedNumbers, findUnsupportedNumbers } from "./numberGuard";
import type { OverviewModel } from "@/lib/data/overview";
import { bucketDeadlines, type UpcomingDeadline } from "@/lib/data/deadlines";

const overview: OverviewModel = {
  totalAtRisk: 210000,
  composition: [],
  needsAction: [],
  hasAnyData: true,
};

function deadline(
  id: string,
  title: string,
  daysToDue: number,
  amount: number | null = 1000
): UpcomingDeadline {
  return {
    id,
    module: "Payments",
    href: "/payments",
    title,
    what: "MSME payment",
    dueDate: "2026-07-20",
    daysToDue,
    amount,
  };
}

describe("buildBriefFacts", () => {
  it("replaces vendor names with refs so they never leave the server", () => {
    const deadlines = [
      deadline("a", "Sri Krishna Traders", -8, 142500),
      deadline("b", "Nandi Packaging", 3, 61000),
    ];
    const { facts, names } = buildBriefFacts(overview, bucketDeadlines(deadlines), deadlines);

    const wire = JSON.stringify(facts);
    expect(wire).not.toContain("Sri Krishna Traders");
    expect(wire).not.toContain("Nandi Packaging");
    expect(facts.items.map((i) => i.ref)).toEqual(["V1", "V2"]);
    expect(names.get("V1")).toBe("Sri Krishna Traders");
    expect(names.get("V2")).toBe("Nandi Packaging");
  });

  it("hands over preformatted figures, leaving nothing to calculate", () => {
    const deadlines = [deadline("a", "Acme", -8, 142500)];
    const { facts } = buildBriefFacts(overview, bucketDeadlines(deadlines), deadlines);
    expect(facts.totalAtRisk).toBe("₹2,10,000");
    expect(facts.items[0].amount).toBe("₹1,42,500");
  });

  it("describes timing in words rather than a raw signed number", () => {
    const deadlines = [
      deadline("a", "A", -8),
      deadline("b", "B", 0),
      deadline("c", "C", 3),
    ];
    const { facts } = buildBriefFacts(overview, bucketDeadlines(deadlines), deadlines);
    expect(facts.items.map((i) => i.timing)).toEqual([
      "overdue by 8 days",
      "due today",
      "due in 3 days",
    ]);
  });

  it("caps how much leaves the server", () => {
    const deadlines = Array.from({ length: 20 }, (_, i) =>
      deadline(`d${i}`, `Vendor ${i}`, i)
    );
    const { facts } = buildBriefFacts(overview, bucketDeadlines(deadlines), deadlines);
    expect(facts.items).toHaveLength(5);
  });

  it("carries no amount for a non-monetary filing", () => {
    const deadlines = [deadline("a", "GSTR-3B", 3, null)];
    const { facts } = buildBriefFacts(overview, bucketDeadlines(deadlines), deadlines);
    expect(facts.items[0].amount).toBeNull();
  });

  it("produces facts whose numbers permit an honest brief and reject a wrong one", () => {
    // The end-to-end contract: the guard, fed the real facts, must let a faithful
    // sentence through and stop a miscopied figure.
    const deadlines = [deadline("a", "Sri Krishna Traders", -8, 142500)];
    const { facts } = buildBriefFacts(overview, bucketDeadlines(deadlines), deadlines);
    const allowed = collectAllowedNumbers(facts);

    const honest = "V1 is overdue by 8 days and ₹1,42,500 is at risk.";
    expect(findUnsupportedNumbers(honest, allowed)).toEqual([]);

    const miscopied = "V1 is overdue by 8 days and ₹14,250 is at risk.";
    expect(findUnsupportedNumbers(miscopied, allowed)).toEqual([14250]);
  });
});

/**
 * The whole path, with the model's reply stubbed: fetch, parse, guard, restore.
 * These are the cases that decide whether a wrong number can ever reach a user.
 */
describe("generateBrief", () => {
  const deadlines = [deadline("a", "Sri Krishna Traders", -8, 142500)];
  const { facts, names } = buildBriefFacts(overview, bucketDeadlines(deadlines), deadlines);

  function stubReply(content: string, ok = true) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok,
        json: async () => ({ choices: [{ message: { content } }] }),
      })
    );
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("stays dormant with no API key, making no request at all", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "");
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect(await generateBrief(facts, names)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns a faithful brief with the real vendor name restored", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "test-key");
    stubReply("V1 is overdue by 8 days, putting ₹1,42,500 at risk.");
    expect(await generateBrief(facts, names)).toBe(
      "Sri Krishna Traders is overdue by 8 days, putting ₹1,42,500 at risk."
    );
  });

  it("discards a brief that miscopies a rupee figure", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "test-key");
    stubReply("V1 is overdue by 8 days, putting ₹14,250 at risk.");
    expect(await generateBrief(facts, names)).toBeNull();
  });

  it("discards a brief that does arithmetic of its own", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "test-key");
    stubReply("V1 owes ₹1,42,500 plus ₹25,650 interest.");
    expect(await generateBrief(facts, names)).toBeNull();
  });

  it("never sends the vendor name to the endpoint", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "test-key");
    stubReply("V1 is overdue by 8 days.");
    await generateBrief(facts, names);
    const body = String((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).not.toContain("Sri Krishna Traders");
    expect(body).toContain("V1");
  });

  it("returns null on an HTTP error", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "test-key");
    stubReply("V1 is fine.", false);
    expect(await generateBrief(facts, names)).toBeNull();
  });

  it("returns null when the endpoint throws or times out", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("aborted")));
    expect(await generateBrief(facts, names)).toBeNull();
  });

  it("returns null on a malformed reply", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    expect(await generateBrief(facts, names)).toBeNull();
  });

  it("rejects an overlong ramble instead of rendering it", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "test-key");
    stubReply("V1 is late. ".repeat(200));
    expect(await generateBrief(facts, names)).toBeNull();
  });
});
