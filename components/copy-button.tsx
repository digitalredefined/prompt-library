"use client";

import { useEffect, useRef, useState } from "react";

/**
 * One-click copy of arbitrary text with a transient toast confirmation (DIG-19).
 * Self-contained (no toast library — shadcn/ui arrives in M7): on success it
 * shows a fixed, aria-live toast that auto-dismisses.
 */
export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [toast, setToast] = useState<null | "ok" | "err">(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setToast("ok");
    } catch {
      setToast("err");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 1800);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={
          className ??
          "border-foreground/15 hover:bg-foreground/5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
        }
      >
        {label}
      </button>

      {/* Fixed toast; polite live region so screen readers announce the result. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center"
      >
        {toast ? (
          <span
            className={`rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
              toast === "ok"
                ? "bg-foreground text-background"
                : "bg-red-600 text-white"
            }`}
          >
            {toast === "ok" ? "Copied to clipboard" : "Couldn’t copy"}
          </span>
        ) : null}
      </div>
    </>
  );
}
