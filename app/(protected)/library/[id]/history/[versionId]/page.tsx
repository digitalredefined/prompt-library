import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { diffLines } from "@/lib/diff";
import { getPrompt, getPromptVersion } from "@/lib/prompts";
import { requireUser } from "@/lib/session";
import { restoreVersionAction } from "../../../actions";

export const metadata = {
  title: "Version · Prompt Library",
};

const dateFmt = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function VersionDiffPage({
  params,
}: {
  params: Promise<{ id: string; versionId: string }>;
}) {
  const { id, versionId } = await params;
  const user = await requireUser(`/library/${id}/history/${versionId}`);
  const [prompt, version] = await Promise.all([
    getPrompt(user.id, id),
    getPromptVersion(user.id, id, versionId),
  ]);
  if (!prompt || !version) notFound();

  // Diff this version against the prompt's current body.
  const diff = diffLines(version.body, prompt.body);
  const isCurrent = version.body === prompt.body;
  const restore = restoreVersionAction.bind(null, prompt.id, version.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-1">
        <Link
          href={`/library/${prompt.id}/history`}
          className="text-foreground/50 hover:text-foreground w-fit text-sm transition-colors"
        >
          ← Version history
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Version from {dateFmt.format(version.createdAt)}
        </h1>
        <p className="text-foreground/60 text-sm">
          {version.source === "AI" ? "AI optimization" : "Manual save"}
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-foreground/60 text-xs font-medium tracking-wide uppercase">
          This version
        </h2>
        <pre className="border-foreground/10 bg-foreground/[0.03] overflow-x-auto rounded-lg border p-4 font-mono text-sm whitespace-pre-wrap">
          {version.body}
        </pre>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-foreground/60 text-xs font-medium tracking-wide uppercase">
          Changes since this version
        </h2>
        {isCurrent ? (
          <p className="text-foreground/50 text-sm">
            This is the current version — nothing has changed since.
          </p>
        ) : (
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
                {line.text || " "}
              </div>
            ))}
          </pre>
        )}
      </section>

      {!isCurrent ? (
        <form action={restore} className="border-foreground/10 border-t pt-5">
          <Button type="submit">Restore this version</Button>
          <p className="text-foreground/40 mt-2 text-xs">
            Restoring applies this version&rsquo;s content and adds a new entry
            to the history.
          </p>
        </form>
      ) : null}
    </main>
  );
}
