import { Fragment, type ReactNode } from "react";

import { searchTerms } from "@/lib/prompts";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Wrap case-insensitive matches of any search term in `<mark>` (DIG-27). Terms
 * mirror `searchTerms` so the highlighting lines up with what the query matched.
 * Returns the text unchanged when there's no query.
 */
export function highlight(text: string, query: string | undefined): ReactNode {
  const terms = searchTerms(query);
  if (terms.length === 0) return text;

  // One capturing group → `split` interleaves matches (odd indices) with the
  // surrounding text (even indices).
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  return text.split(pattern).map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        className="rounded bg-yellow-300/50 text-inherit dark:bg-yellow-400/25"
      >
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
