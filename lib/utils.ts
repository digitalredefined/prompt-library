/**
 * Shared utilities. `cn` merges conditional class names.
 *
 * Currently dependency-free; will be swapped for the clsx + tailwind-merge
 * variant when shadcn/ui is introduced (DIG-34, M7).
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
