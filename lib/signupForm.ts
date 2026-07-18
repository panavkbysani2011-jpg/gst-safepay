import { z } from "zod";

// Creating an account. Separate from the login form because signing up asks for
// more than credentials: a name we can greet you by, and a confirmed password so
// a typo does not lock you out of an account you cannot yet log into.
//
// Login stays by EMAIL. The username here is a display handle stored on the
// account, not a second way to sign in, and it is not checked for uniqueness
// (that would need its own table); the form copy says so rather than implying
// a guarantee we do not enforce.
export const SignupFormSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Enter your full name")
      .max(120, "That name is too long"),
    username: z
      .string()
      .trim()
      .max(40, "That username is too long")
      .regex(/^[a-zA-Z0-9._-]*$/, "Username can use letters, numbers, dots, dashes and underscores")
      .optional()
      .or(z.literal("")),
    email: z.string().trim().min(1, "Enter your email").email("That email does not look right"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Re-enter your password to confirm"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "The two passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof SignupFormSchema>;

export type ParseSignupResult =
  | { ok: true; value: SignupFormValues }
  | { ok: false; message: string };

/** Validate signup values. Returns the first error message on failure. */
export function parseSignupForm(input: unknown): ParseSignupResult {
  const parsed = SignupFormSchema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  const first = parsed.error.issues[0];
  return {
    ok: false,
    message: first?.message ?? "Please check the details and try again.",
  };
}
