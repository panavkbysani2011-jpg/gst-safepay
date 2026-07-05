import { describe, it, expect } from "vitest";
import { groupActions } from "./report";
import type { NeedsActionItem } from "@/lib/data/overview";

function item(id: string, sev: number): NeedsActionItem {
  return {
    id,
    module: "Payments",
    href: "/payments",
    title: `Vendor ${id}`,
    detail: "something",
    amount: 1000,
    tone: sev >= 2 ? "danger" : "warning",
    sev,
  };
}

describe("groupActions", () => {
  it("returns empty groups for no items", () => {
    const g = groupActions([]);
    expect(g.actNow).toEqual([]);
    expect(g.dueSoon).toEqual([]);
    expect(g.total).toBe(0);
  });

  it("splits urgent (sev>=2) into actNow and soon (sev===1) into dueSoon", () => {
    const g = groupActions([item("a", 2), item("b", 1), item("c", 2)]);
    expect(g.actNow.map((i) => i.id)).toEqual(["a", "c"]);
    expect(g.dueSoon.map((i) => i.id)).toEqual(["b"]);
    expect(g.total).toBe(3);
  });

  it("preserves the incoming order within each group", () => {
    const g = groupActions([item("x", 1), item("y", 1)]);
    expect(g.dueSoon.map((i) => i.id)).toEqual(["x", "y"]);
  });

  it("excludes items with no urgency (sev<=0) from both groups", () => {
    const g = groupActions([item("a", 2), item("z", 0)]);
    expect(g.actNow.map((i) => i.id)).toEqual(["a"]);
    expect(g.dueSoon).toEqual([]);
    expect(g.total).toBe(1);
  });
});
