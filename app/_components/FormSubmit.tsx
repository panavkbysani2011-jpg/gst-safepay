"use client";

import { useFormStatus } from "react-dom";

// Full-width primary submit button that reflects the enclosing form's pending state.
// The server action goes on the <form action={...}>; this is just type="submit".
export function FormSubmit({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-fg shadow-sm transition-[transform,filter] duration-150 hover:brightness-110 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
