import { describe, it, expect } from "vitest";
import { GLOSSARY, glossaryEntry, allGlossaryEntries } from "./glossary";

// The whole point of these lines is that a non-accountant can read them. A
// definition that leans on more jargon has failed at its one job, so that is
// what these tests check.

const JARGON_INSIDE_DEFINITIONS = [
  "GSTR-2B",
  "GSTR-3B",
  "ITC",
  "RCM",
  "MSMED",
  "43B",
  "47A",
  "deemed",
];

describe("glossary content", () => {
  it("gives every term a plain sentence", () => {
    for (const [key, entry] of Object.entries(GLOSSARY)) {
      expect(entry.term.length, `${key} has no term`).toBeGreaterThan(0);
      expect(entry.plain.length, `${key} has no explanation`).toBeGreaterThan(20);
      expect(entry.plain.trim().endsWith("."), `${key} should read as a sentence`).toBe(true);
    }
  });

  it("does not explain jargon with more jargon", () => {
    for (const [key, entry] of Object.entries(GLOSSARY)) {
      for (const bad of JARGON_INSIDE_DEFINITIONS) {
        // A term is allowed to contain itself (e.g. the Rule 47A entry), but no
        // OTHER entry may lean on it inside the explanation.
        if (entry.term.includes(bad)) continue;
        expect(
          entry.plain.includes(bad),
          `${key} explains using "${bad}", which the reader also will not know`
        ).toBe(false);
      }
    }
  });

  it("uses no em dashes (house style)", () => {
    for (const entry of Object.values(GLOSSARY)) {
      expect(entry.plain.includes("—")).toBe(false);
    }
  });
});

describe("lookup helpers", () => {
  it("returns an entry for a known key", () => {
    expect(glossaryEntry("itc")?.term).toBe("Input tax credit (ITC)");
  });

  it("returns null for an unknown key instead of throwing", () => {
    expect(glossaryEntry("not-a-real-term")).toBeNull();
  });

  it("lists every entry, sorted by term", () => {
    const all = allGlossaryEntries();
    expect(all).toHaveLength(Object.keys(GLOSSARY).length);
    const terms = all.map((e) => e.term);
    expect(terms).toEqual([...terms].sort((a, b) => a.localeCompare(b)));
  });
});
