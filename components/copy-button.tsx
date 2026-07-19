"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { recordPromptUsageAction } from "@/app/(protected)/library/actions";
import { Button } from "@/components/ui/button";

/**
 * One-click copy of arbitrary text with a toast confirmation (DIG-19).
 * Uses the shared shadcn `Button` and the app's sonner toaster (DIG-34); shows
 * a brief inline "Copied" affordance on the button itself for tactile feedback.
 *
 * When a `promptId` is given, a successful copy also records a "use" of that
 * prompt (DIG-28) to power the "most used" sort — fire-and-forget, so it never
 * blocks or fails the copy.
 */
export function CopyButton({
  text,
  promptId,
  label = "Copy",
  className,
  variant = "outline",
  size = "sm",
}: {
  text: string;
  promptId?: string;
  label?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const [copied, setCopied] = useState(false);
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
      setCopied(true);
      toast.success("Copied to clipboard");
      // Best-effort usage tracking; a failure here must never affect the copy.
      if (promptId) void recordPromptUsageAction(promptId).catch(() => {});
    } catch {
      toast.error("Couldn’t copy to clipboard");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button
      type="button"
      onClick={copy}
      variant={variant}
      size={size}
      className={className}
    >
      {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
      {label}
    </Button>
  );
}
