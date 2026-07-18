"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { createCategoryAction } from "@/app/(protected)/library/category-actions";
import {
  INITIAL_FORM_STATE,
  type FormState,
} from "@/app/(protected)/library/form-state";

export type CategoryOption = { id: string; name: string; color: string | null };

type PromptFormValues = {
  title: string;
  body: string;
  notes: string | null;
  folderId: string | null;
  categoryIds: string[];
  tags: string[];
};

/** Preset swatches for creating a category inline (DIG-24 supports any hex). */
const CATEGORY_COLORS = [
  "#4F46E5",
  "#DB2777",
  "#059669",
  "#D97706",
  "#0891B2",
  "#7C3AED",
];

/**
 * Shared create/edit form (DIG-15), extended with category & tag assignment
 * (DIG-25). Driven by a server action via `useActionState`. Category selection
 * and the tag editor are client-managed (so a just-created category can be
 * selected immediately, and tags can be added on the fly); their values are
 * submitted as `categoryIds` (checkboxes) and `tagNames` (hidden inputs).
 */
export function PromptForm({
  action,
  folders,
  categories,
  tagSuggestions,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  folders: { id: string; name: string }[];
  categories: CategoryOption[];
  tagSuggestions: string[];
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

      <CategoryPicker
        categories={categories}
        initialSelected={initial?.categoryIds ?? []}
      />

      <TagEditor
        initialTags={initial?.tags ?? []}
        suggestions={tagSuggestions}
      />

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

/** Multi-select of categories (controlled checkboxes) with inline create. */
function CategoryPicker({
  categories,
  initialSelected,
}: {
  categories: CategoryOption[];
  initialSelected: string[];
}) {
  const [options, setOptions] = useState(categories);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected),
  );
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createCategory() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    const result = await createCategoryAction(trimmed, color);
    setCreating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOptions((prev) => [...prev, result.category]);
    setSelected((prev) => new Set(prev).add(result.category.id));
    setName("");
    setAdding(false);
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">
        Categories <span className="text-foreground/40">(optional)</span>
      </legend>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((c) => {
          const isOn = selected.has(c.id);
          return (
            <label
              key={c.id}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                isOn
                  ? "border-foreground/40 bg-foreground/10 font-medium"
                  : "border-foreground/15 hover:bg-foreground/5"
              }`}
            >
              <input
                type="checkbox"
                name="categoryIds"
                value={c.id}
                checked={isOn}
                onChange={() => toggle(c.id)}
                className="sr-only"
              />
              {c.color ? (
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
              ) : null}
              {c.name}
            </label>
          );
        })}

        {adding ? (
          <span className="border-foreground/15 flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-2">
            <span className="flex items-center gap-1">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className={`h-4 w-4 rounded-full ${color === c ? "ring-foreground/50 ring-2 ring-offset-1" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void createCategory();
                }
                if (e.key === "Escape") setAdding(false);
              }}
              autoFocus
              maxLength={60}
              placeholder="New category"
              aria-label="New category name"
              className="w-28 min-w-0 bg-transparent text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => void createCategory()}
              disabled={creating}
              className="text-foreground/60 hover:text-foreground px-1 text-sm disabled:opacity-40"
              aria-label="Add category"
            >
              ✓
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className="text-foreground/50 hover:text-foreground px-0.5 text-sm"
              aria-label="Cancel"
            >
              ✕
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="border-foreground/15 text-foreground/60 hover:bg-foreground/5 rounded-full border border-dashed px-3 py-1 text-sm transition-colors"
          >
            + New category
          </button>
        )}
      </div>
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </fieldset>
  );
}

/** Free-form tag editor: type + Enter/comma to add a chip; submitted as hidden inputs. */
function TagEditor({
  initialTags,
  suggestions,
}: {
  initialTags: string[];
  suggestions: string[];
}) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [input, setInput] = useState("");

  function addTag(raw: string) {
    const name = raw.trim();
    if (!name) return;
    // Case-insensitive de-dupe; keep the first-entered casing.
    if (tags.some((t) => t.toLowerCase() === name.toLowerCase())) {
      setInput("");
      return;
    }
    setTags((prev) => [...prev, name.slice(0, 50)]);
    setInput("");
  }

  function removeTag(name: string) {
    setTags((prev) => prev.filter((t) => t !== name));
  }

  const available = suggestions.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        Tags <span className="text-foreground/40">(optional)</span>
      </span>
      <div className="border-foreground/15 focus-within:border-foreground/40 flex flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className="bg-foreground/10 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
          >
            <input type="hidden" name="tagNames" value={t} />
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              aria-label={`Remove tag ${t}`}
              className="text-foreground/50 hover:text-foreground"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(input);
            } else if (e.key === "Backspace" && !input && tags.length) {
              removeTag(tags[tags.length - 1]);
            }
          }}
          onBlur={() => addTag(input)}
          list="tag-suggestions"
          maxLength={50}
          placeholder={tags.length ? "" : "Add tags…"}
          aria-label="Add a tag"
          className="min-w-24 flex-1 bg-transparent text-sm outline-none"
        />
        <datalist id="tag-suggestions">
          {available.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <span className="text-foreground/40 text-xs">
        Press Enter or comma to add. New tags are created automatically.
      </span>
    </div>
  );
}
