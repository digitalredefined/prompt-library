import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names, resolving Tailwind conflicts.
 *
 * `clsx` handles conditional/array/object inputs; `tailwind-merge` ensures the
 * last conflicting utility wins (e.g. `px-2 px-4` → `px-4`). This is the
 * standard shadcn/ui `cn` helper (introduced in DIG-34, M7).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
