import Link from "next/link";

import { CopyButton } from "@/components/copy-button";
import { countPrompts, listPrompts } from "@/lib/prompts";
import { requireUser } from "@/lib/session";

export const metadata = {
  title: "Library · Prompt Library",
};

const PAGE_SIZE = 10;

const dateFmt = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser("/library");
  const { page: pageParam } = await searchParams;

  const total = await countPrompts(user.id);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), pageCount);

  const prompts = await listPrompts(user.id, {
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Your library</h1>
          <p className="text-foreground/60 text-sm">
            {total} {total === 1 ? "prompt" : "prompts"}
          </p>
        </div>
        <Link
          href="/library/new"
          className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
        >
          New prompt
        </Link>
      </div>

      {total === 0 ? (
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
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {prompts.map((prompt) => (
            <li
              key={prompt.id}
              className="border-foreground/10 hover:border-foreground/25 flex flex-col gap-2 rounded-lg border p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/library/${prompt.id}`}
                  className="font-medium hover:underline"
                >
                  {prompt.title}
                </Link>
                {prompt.visibility === "UNLISTED" ? (
                  <span className="text-foreground/50 shrink-0 rounded-full border border-current px-2 py-0.5 text-[11px] font-medium">
                    Shared
                  </span>
                ) : null}
              </div>
              <p className="text-foreground/50 line-clamp-2 flex-1 text-sm">
                {prompt.body}
              </p>
              <span className="text-foreground/40 text-xs">
                Updated {dateFmt.format(prompt.updatedAt)}
              </span>
              <div className="flex items-center gap-2 pt-1">
                <Link
                  href={`/library/${prompt.id}`}
                  className="border-foreground/15 hover:bg-foreground/5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
                >
                  Open
                </Link>
                <CopyButton
                  text={prompt.body}
                  className="border-foreground/15 hover:bg-foreground/5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
                />
                <Link
                  href={`/library/${prompt.id}/edit`}
                  className="border-foreground/15 hover:bg-foreground/5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
                >
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? (
        <nav className="flex items-center justify-between pt-2 text-sm">
          {page > 1 ? (
            <Link
              href={`/library?page=${page - 1}`}
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              ← Previous
            </Link>
          ) : (
            <span className="text-foreground/30">← Previous</span>
          )}
          <span className="text-foreground/50">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={`/library?page=${page + 1}`}
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              Next →
            </Link>
          ) : (
            <span className="text-foreground/30">Next →</span>
          )}
        </nav>
      ) : null}
    </main>
  );
}
