"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  INITIAL_FORM_STATE,
  type FormState,
} from "@/app/(protected)/library/form-state";

type PromptFormValues = {
  title: string;
  body: string;
  notes: string | null;
  folderId: string | null;
};

/**
 * Shared create/edit form. Driven by a server action via `useActionState`, so it
 * works without client-side JS and surfaces the typed field/form errors the
 * action returns.
 */
export function PromptForm({
  action,
  folders,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  folders: { id: string; name: string }[];
  initial?: PromptFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_FORM_STATE,
  );
  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Title</span>
        <input
          name="title"
          defaultValue={initial?.title}
          autoFocus
          required
          maxLength={200}
          className="border-foreground/15 focus:border-foreground/40 rounded-md border bg-transparent px-3 py-2 text-sm outline-none"
          placeholder="e.g. Cold outreach email"
        />
        {fieldError("title") ? (
          <span className="text-xs text-red-600 dark:text-red-400">
            {fieldError("title")}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Folder</span>
        <select
          name="folderId"
          defaultValue={initial?.folderId ?? ""}
          className="border-foreground/15 focus:border-foreground/40 rounded-md border bg-transparent px-3 py-2 text-sm outline-none"
        >
          <option value="">No folder (library root)</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Prompt</span>
        <textarea
          name="body"
          defaultValue={initial?.body}
          rows={8}
          required
          className="border-foreground/15 focus:border-foreground/40 rounded-md border bg-transparent px-3 py-2 font-mono text-sm outline-none"
          placeholder="Write the prompt text…"
        />
        {fieldError("body") ? (
          <span className="text-xs text-red-600 dark:text-red-400">
            {fieldError("body")}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          Notes <span className="text-foreground/40">(optional)</span>
        </span>
        <textarea
          name="notes"
          defaultValue={initial?.notes ?? ""}
          rows={2}
          maxLength={2000}
          className="border-foreground/15 focus:border-foreground/40 rounded-md border bg-transparent px-3 py-2 text-sm outline-none"
          placeholder="Context, constraints, reminders…"
        />
        {fieldError("notes") ? (
          <span className="text-xs text-red-600 dark:text-red-400">
            {fieldError("notes")}
          </span>
        ) : null}
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="text-foreground/60 hover:text-foreground text-sm transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
