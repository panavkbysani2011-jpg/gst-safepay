import { describe, it, expect } from "vitest";
import { bucketDeadlines, type UpcomingDeadline } from "./deadlines";

function deadline(id: string, daysToDue: number, amount: number | null = 1000): UpcomingDeadline {
  return {
    id,
    module: "Payments",
    href: "/payments",
    title: "Acme",
    what: "MSME payment",
    dueDate: "2026-07-20",
    daysToDue,
    amount,
  };
}

describe("bucketDeadlines", () => {
  it("splits deadlines into the windows a business acts on", () => {
    const buckets = bucketDeadlines([
      deadline("a", -5),
      deadline("b", 0),
      deadline("c", 7),
      deadline("d", 8),
      deadline("e", 30),
      deadline("f", 31),
    ]);
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
    expect(byKey.overdue.items.map((i) => i.id)).toEqual(["a"]);
    expect(byKey.next7.items.map((i) => i.id)).toEqual(["b", "c"]); // today and day 7 included
    expect(byKey.next30.items.map((i) => i.id)).toEqual(["d", "e"]); // 8..30 inclusive
    expect(byKey.later.items.map((i) => i.id)).toEqual(["f"]);
  });

  it("treats today (0 days) as due now, not overdue", () => {
    const buckets = bucketDeadlines([deadline("today", 0)]);
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
    expect(byKey.overdue.count).toBe(0);
    expect(byKey.next7.count).toBe(1);
  });

  it("totals the money in each window", () => {
    const buckets = bucketDeadlines([
      deadline("a", -1, 5000),
      deadline("b", -2, 2500),
      deadline("c", 3, 1000),
    ]);
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
    expect(byKey.overdue.amount).toBe(7500);
    expect(byKey.next7.amount).toBe(1000);
  });

  it("counts non-monetary obligations without inflating the money total", () => {
    // A filing deadline has no rupee figure, but still has to show up.
    const buckets = bucketDeadlines([deadline("filing", 2, null), deadline("bill", 2, 400)]);
    const next7 = buckets.find((b) => b.key === "next7")!;
    expect(next7.count).toBe(2);
    expect(next7.amount).toBe(400);
  });

  it("keeps empty windows, because a gap is information too", () => {
    const buckets = bucketDeadlines([deadline("a", 2)]);
    expect(buckets).toHaveLength(4);
    expect(buckets.every((b) => typeof b.count === "number")).toBe(true);
    expect(buckets.find((b) => b.key === "overdue")!.count).toBe(0);
  });

  it("handles no deadlines at all", () => {
    const buckets = bucketDeadlines([]);
    expect(buckets).toHaveLength(4);
    expect(buckets.every((b) => b.count === 0 && b.amount === 0)).toBe(true);
  });

  it("surfaces clustering that a sorted list hides", () => {
    // The point of the view: four things landing inside one week.
    const buckets = bucketDeadlines([
      deadline("a", 3),
      deadline("b", 3),
      deadline("c", 4),
      deadline("d", 4),
      deadline("e", 25),
    ]);
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
    expect(byKey.next7.count).toBe(4);
    expect(byKey.next30.count).toBe(1);
  });
});
