"use client";

import { RotateCwIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * App-wide error boundary (DIG-36). Catches render/data errors in any route
 * below the root layout (so the header stays), shows a friendly message, and
 * offers a retry (`reset()` re-renders the failed segment) plus an escape hatch
 * back to the library.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for local debugging / future error tracking (DIG-40 Sentry).
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <RotateCwIcon className="size-6" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground text-sm">
          An unexpected error occurred. You can try again, or head back to your
          library.
        </p>
        {error.digest ? (
          <p className="text-muted-foreground/70 mt-1 font-mono text-xs">
            Ref: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={reset}>
          <RotateCwIcon aria-hidden />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/library">Back to library</Link>
        </Button>
      </div>
    </main>
  );
}
