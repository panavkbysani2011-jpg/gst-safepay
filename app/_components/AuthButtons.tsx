"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { login } from "@/app/auth-actions";

export function AuthButtons() {
  const { pending } = useFormStatus();

  return (
    <div className="mt-1 flex flex-col gap-2.5">
      <button
        type="submit"
        formAction={login}
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-fg shadow-sm transition-[transform,filter] duration-150 hover:brightness-110 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Log in"}
      </button>
      {/* A LINK, not a submit. Signing up asks for a name and a confirmed
          password, so it needs its own screen; submitting this form only ever
          tripped the empty-email validation and looked broken. */}
      <Link
        href="/signup"
        className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border-strong bg-surface px-5 text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none"
      >
        Create account
      </Link>
    </div>
  );
}
