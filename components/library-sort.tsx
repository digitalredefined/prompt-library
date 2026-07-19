"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DEFAULT_SORT, type PromptSort } from "@/lib/prompts";

const OPTIONS: { value: PromptSort; label: string }[] = [
  { value: "recent", label: "Recently updated" },
  { value: "title", label: "Alphabetical" },
  { value: "used", label: "Most used" },
];

/** One year, in seconds — how long the last-used sort is remembered. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Library sort control (DIG-28). The choice lives in the URL as `sort` so a
 * sorted view is shareable and combines with the DIG-26/27 filters, and is
 * mirrored into the `library_sort` cookie so it persists as the default on the
 * next visit (read server-side in the library page). The current value is
 * resolved on the server and passed in, so param and cookie can't disagree.
 */
export function LibrarySort({ value }: { value: PromptSort }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function onChange(next: PromptSort) {
    // Remember the choice for future visits (persist last-used sort).
    document.cookie = `library_sort=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;

    const p = new URLSearchParams(params.toString());
    // Keep default URLs clean: the cookie now also holds the default, so the
    // server resolves the same value without the param.
    if (next === DEFAULT_SORT) p.delete("sort");
    else p.set("sort", next);
    p.delete("page");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className="text-foreground/60 flex items-center gap-2 text-sm">
      <span className="sr-only sm:not-sr-only">Sort</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PromptSort)}
        aria-label="Sort prompts"
        className="border-foreground/15 focus:border-foreground/40 bg-background text-foreground rounded-md border px-2 py-1.5 text-sm transition-colors outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
