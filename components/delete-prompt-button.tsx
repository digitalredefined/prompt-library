"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Delete control with an inline two-step confirm — avoids accidental deletes
 * without using a blocking native `confirm()` dialog. The actual delete is a
 * server action (bound with the prompt id) passed in from the server component.
 */
export function DeletePromptButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="border-foreground/15 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:border-red-500/50 hover:text-red-600 dark:hover:text-red-400"
      >
        Delete
      </button>
    );
  }

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <span className="text-foreground/60 text-sm">Are you sure?</span>
      <ConfirmDeleteButton />
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-foreground/60 hover:text-foreground text-sm transition-colors"
      >
        Cancel
      </button>
    </form>
  );
}

function ConfirmDeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/20 disabled:opacity-50 dark:text-red-400"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
