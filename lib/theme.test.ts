import { describe, it, expect } from "vitest";
import { isTheme, normalizeTheme, THEMES } from "./theme";

describe("theme", () => {
  it("recognises the three shipped themes", () => {
    expect(THEMES).toEqual(["light", "dark", "paper"]);
    for (const t of THEMES) expect(isTheme(t)).toBe(true);
  });

  it("rejects unknown or wrong-typed values", () => {
    for (const v of ["", "blue", "LIGHT", null, undefined, 3, {}, []]) {
      expect(isTheme(v)).toBe(false);
    }
  });

  it("normalizeTheme returns the theme or null", () => {
    expect(normalizeTheme("dark")).toBe("dark");
    expect(normalizeTheme("paper")).toBe("paper");
    expect(normalizeTheme("light")).toBe("light");
    expect(normalizeTheme("nope")).toBeNull();
    expect(normalizeTheme(undefined)).toBeNull();
    expect(normalizeTheme(42)).toBeNull();
  });
});
