import { describe, it, expect } from "vitest";
import { parseSignupForm } from "./signupForm";

const valid = {
  fullName: "Panav Bysani",
  username: "panav",
  email: "owner@example.in",
  password: "hunter2pass",
  confirmPassword: "hunter2pass",
};

describe("parseSignupForm", () => {
  it("accepts a complete signup", () => {
    expect(parseSignupForm(valid).ok).toBe(true);
  });

  it("requires a full name", () => {
    expect(parseSignupForm({ ...valid, fullName: "  " })).toEqual({
      ok: false,
      message: "Enter your full name",
    });
  });

  it("treats the username as optional", () => {
    expect(parseSignupForm({ ...valid, username: "" }).ok).toBe(true);
  });

  it("rejects a username with spaces or symbols", () => {
    expect(parseSignupForm({ ...valid, username: "not a name!" }).ok).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(parseSignupForm({ ...valid, email: "nope" }).ok).toBe(false);
  });

  it("rejects a short password", () => {
    expect(parseSignupForm({ ...valid, password: "abc", confirmPassword: "abc" })).toEqual({
      ok: false,
      message: "Password must be at least 6 characters",
    });
  });

  it("catches a mistyped confirmation, which would otherwise lock the user out", () => {
    expect(parseSignupForm({ ...valid, confirmPassword: "hunter2pasz" })).toEqual({
      ok: false,
      message: "The two passwords do not match",
    });
  });
});
