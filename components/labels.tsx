/**
 * Presentational chips for a prompt's classification (DIG-25): a colored
 * category pill and a lighter tag pill. Server-component-safe (no client hooks),
 * reused by the library cards and the prompt detail view.
 */

/** A category pill; uses the category's color for its accent when set. */
export function CategoryChip({
  name,
  color,
}: {
  name: string;
  color: string | null;
}) {
  return (
    <span className="border-foreground/15 flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium">
      {color ? (
        <span
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {name}
    </span>
  );
}

/** A free-form tag pill, prefixed with `#`. */
export function TagChip({ name }: { name: string }) {
  return (
    <span className="bg-foreground/[0.07] text-foreground/70 rounded-full px-2 py-0.5 text-xs">
      #{name}
    </span>
  );
}
