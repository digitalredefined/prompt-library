import Link from "next/link";

import { listPrompts } from "@/lib/prompts";
import { requireUser } from "@/lib/session";

export const metadata = {
  title: "Library · Prompt Library",
};

const dateFmt = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function LibraryPage() {
  const user = await requireUser("/library");
  const prompts = await listPrompts(user.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Your library</h1>
          <p className="text-foreground/60 text-sm">
            {prompts.length} {prompts.length === 1 ? "prompt" : "prompts"}
          </p>
        </div>
        <Link
          href="/library/new"
          className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
        >
          New prompt
        </Link>
      </div>

      {prompts.length === 0 ? (
        <div className="border-foreground/10 bg-foreground/[0.03] flex flex-col items-start gap-3 rounded-lg border p-6">
          <p className="text-foreground/70 text-sm">
            No prompts yet. Create your first one to get started.
          </p>
          <Link
            href="/library/new"
            className="text-sm font-medium underline underline-offset-4"
          >
            New prompt →
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {prompts.map((prompt) => (
            <li key={prompt.id}>
              <Link
                href={`/library/${prompt.id}`}
                className="border-foreground/10 hover:border-foreground/25 hover:bg-foreground/[0.02] flex flex-col gap-1 rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{prompt.title}</span>
                  {prompt.visibility === "UNLISTED" ? (
                    <span className="text-foreground/50 shrink-0 rounded-full border border-current px-2 py-0.5 text-[11px] font-medium">
                      Shared
                    </span>
                  ) : null}
                </div>
                <span className="text-foreground/50 line-clamp-1 text-sm">
                  {prompt.body}
                </span>
                <span className="text-foreground/40 text-xs">
                  Updated {dateFmt.format(prompt.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
