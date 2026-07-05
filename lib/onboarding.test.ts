import { describe, it, expect } from "vitest";
import { getGettingStartedState } from "./onboarding";

describe("getGettingStartedState", () => {
  it("marks nothing done for a cold account", () => {
    const s = getGettingStartedState({ vendors: 0, bills: 0, gstRecords: 0 });
    expect(s.total).toBe(3);
    expect(s.completedCount).toBe(0);
    expect(s.allDone).toBe(false);
    expect(s.steps.map((x) => x.done)).toEqual([false, false, false]);
  });

  it("ticks the vendors milestone once a vendor exists", () => {
    const s = getGettingStartedState({ vendors: 2, bills: 0, gstRecords: 0 });
    expect(s.steps.find((x) => x.key === "vendors")?.done).toBe(true);
    expect(s.completedCount).toBe(1);
    expect(s.allDone).toBe(false);
  });

  it("ticks the bills milestone once a bill exists", () => {
    const s = getGettingStartedState({ vendors: 0, bills: 1, gstRecords: 0 });
    expect(s.steps.find((x) => x.key === "bills")?.done).toBe(true);
    expect(s.completedCount).toBe(1);
  });

  it("ticks the GST milestone when any IMS/RCM/compliance record exists", () => {
    const s = getGettingStartedState({ vendors: 0, bills: 0, gstRecords: 1 });
    expect(s.steps.find((x) => x.key === "gst")?.done).toBe(true);
  });

  it("is fully done when all three have data", () => {
    const s = getGettingStartedState({ vendors: 3, bills: 5, gstRecords: 9 });
    expect(s.completedCount).toBe(3);
    expect(s.allDone).toBe(true);
    expect(s.steps.every((x) => x.done)).toBe(true);
  });

  it("treats negative or non-finite counts as not done (defensive)", () => {
    const s = getGettingStartedState({
      vendors: -1,
      bills: Number.NaN,
      gstRecords: Number.POSITIVE_INFINITY,
    });
    expect(s.completedCount).toBe(0);
    expect(s.allDone).toBe(false);
  });

  it("keeps a stable step order: vendors, bills, gst", () => {
    const s = getGettingStartedState({ vendors: 1, bills: 1, gstRecords: 1 });
    expect(s.steps.map((x) => x.key)).toEqual(["vendors", "bills", "gst"]);
  });
});
