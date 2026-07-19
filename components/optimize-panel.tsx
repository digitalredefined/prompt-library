"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveOptimizedAction } from "@/app/(protected)/library/actions";
import { diffLines } from "@/lib/diff";
import {
  OPTIMIZATION_GOALS,
  type OptimizationGoalId,
  splitOptimizedResult,
} from "@/lib/optimize";

type Status = "idle" | "streaming" | "review" | "error";

/**
 * Client-side driver for the prompt optimization flow (DIG-31/32/33).
 *
 * Pick a goal → stream a rewrite from Claude → review an inline diff of the
 * original vs the suggestion (which stays editable) with the model's
 * explanation → accept (save as a new AI version), reject (back to the prompt),
 * or regenerate. All AI work happens server-side via the streaming route.
 */
export function OptimizePanel({
  promptId,
  originalBody,
  title,
}: {
  promptId: string;
  originalBody: string;
  title: string;
}) {
  const [goal, setGoal] = useState<OptimizationGoalId>("general");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  // Raw streamed text (body + marker + explanation) while streaming.
  const [streamed, setStreamed] = useState("");
  // The editable rewritten body, set once the stream completes (DIG-32 "edit").
  const [edited, setEdited] = useState("");
  const [explanation, setExplanation] = useState("");
  const [saving, startSaving] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  async function optimize() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("streaming");
    setError(null);
    setStreamed("");
    setExplanation("");

    try {
      const res = await fetch(`/library/${promptId}/optimize/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const message = await res
          .json()
          .then((d) => d?.error as string | undefined)
          .catch(() => undefined);
        throw new Error(message ?? "Optimization failed. Please try again.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        // Show only the rewritten prompt (before the marker) as it streams.
        setStreamed(splitOptimizedResult(acc).body);
      }

      const result = splitOptimizedResult(acc);
      setEdited(result.body);
      setExplanation(result.explanation);
      setStatus("review");
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Optimization failed.");
      setStatus("error");
    }
  }

  function accept() {
    setError(null);
    startSaving(async () => {
      const result = await saveOptimizedAction(promptId, edited);
      // A successful save redirects (never returns); only errors come back.
      if (result && !result.ok) {
        setError(result.error ?? "Couldn’t save the optimized prompt.");
      }
    });
  }

  const diff = status === "review" ? diffLines(originalBody, edited) : [];
  const changed = edited.trim() !== originalBody.trim();

  return (
    <div className="flex flex-col gap-6">
      {/* Goal selector */}
      <fieldset
        className="flex flex-col gap-2"
        disabled={status === "streaming"}
      >
        <legend className="text-foreground/60 mb-1 text-xs font-medium tracking-wide uppercase">
          Optimization goal
        </legend>
        <div className="flex flex-wrap gap-2">
          {OPTIMIZATION_GOALS.map((g) => (
            <Button
              key={g.id}
              type="button"
              size="sm"
              variant={goal === g.id ? "default" : "outline"}
              onClick={() => setGoal(g.id)}
              aria-pressed={goal === g.id}
              title={g.description}
            >
              {g.label}
            </Button>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={optimize}
          disabled={status === "streaming"}
        >
          {status === "streaming"
            ? "Optimizing…"
            : status === "idle"
              ? "Optimize"
              : "Regenerate"}
        </Button>
        <Button variant="ghost" asChild>
          <Link href={`/library/${promptId}`}>Cancel</Link>
        </Button>
      </div>

      {error ? (
        <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      {/* Live stream while optimizing */}
      {status === "streaming" ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-foreground/60 text-xs font-medium tracking-wide uppercase">
            Suggested rewrite
          </h2>
          <pre className="border-border bg-muted/40 min-h-24 overflow-x-auto rounded-lg border p-4 font-mono text-sm whitespace-pre-wrap">
            {streamed}
            <span className="animate-pulse">▍</span>
          </pre>
        </section>
      ) : null}

      {/* Review: diff + editable suggestion + explanation + actions */}
      {status === "review" ? (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-foreground/60 text-xs font-medium tracking-wide uppercase">
              Changes vs. current prompt
            </h2>
            {changed ? (
              <pre className="border-foreground/10 overflow-x-auto rounded-lg border p-4 font-mono text-xs leading-relaxed">
                {diff.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.type === "add"
                        ? "bg-success/10 text-success"
                        : line.type === "del"
                          ? "bg-destructive/10 text-destructive"
                          : "text-muted-foreground"
                    }
                  >
                    <span className="opacity-60 select-none">
                      {line.type === "add"
                        ? "+ "
                        : line.type === "del"
                          ? "- "
                          : "  "}
                    </span>
                    {line.text || " "}
                  </div>
                ))}
              </pre>
            ) : (
              <p className="text-foreground/50 text-sm">
                The suggestion matches the current prompt — nothing to save.
              </p>
            )}
          </section>

          {explanation ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-foreground/60 text-xs font-medium tracking-wide uppercase">
                What changed
              </h2>
              <div className="border-foreground/10 text-foreground/80 rounded-lg border p-4 text-sm whitespace-pre-wrap">
                {explanation}
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-2">
            <label
              htmlFor="optimized-body"
              className="text-foreground/60 text-xs font-medium tracking-wide uppercase"
            >
              Suggested rewrite (editable)
            </label>
            <Textarea
              id="optimized-body"
              value={edited}
              onChange={(e) => setEdited(e.target.value)}
              rows={Math.min(24, Math.max(6, edited.split("\n").length + 1))}
              className="rounded-lg p-4 font-mono"
            />
            <p className="text-foreground/40 text-xs">
              Edit the rewrite before saving if you want to tweak it.
            </p>
          </section>

          <div className="border-foreground/10 flex items-center gap-3 border-t pt-5">
            <Button
              type="button"
              onClick={accept}
              disabled={saving || !changed || edited.trim().length === 0}
            >
              {saving ? "Saving…" : "Accept & save"}
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/library/${promptId}`}>Reject</Link>
            </Button>
          </div>
          <p className="text-foreground/40 -mt-3 text-xs">
            Accepting saves this as a new AI version of{" "}
            <span className="font-medium">{title}</span>. The current version
            stays in your history.
          </p>
        </>
      ) : null}
    </div>
  );
}
