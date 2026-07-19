"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Registers the "c" keyboard shortcut to copy a prompt's body (DIG-37). Mounted
 * on the prompt detail page; ignored while the user is typing in a field or when
 * a modifier is held (so native ⌘C / Ctrl+C copy is untouched).
 */
export function CopyHotkey({ text }: { text: string }) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "c" && e.key !== "C") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      ) {
        return;
      }
      // Don't hijack an active text selection the user may be copying.
      if (window.getSelection()?.toString()) return;

      e.preventDefault();
      navigator.clipboard.writeText(text).then(
        () => toast.success("Copied to clipboard"),
        () => toast.error("Couldn’t copy to clipboard"),
      );
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [text]);

  return null;
}
