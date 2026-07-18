import Link from "next/link";

import { PromptList, type PromptCard } from "@/components/prompt-list";
import { getFolder, listFolders } from "@/lib/folders";
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
  searchParams: Promise<{ page?: string; folderId?: string }>;
}) {
  const user = await requireUser("/library");
  const { page: pageParam, folderId: folderParam } = await searchParams;

  // `folderId` absent → all prompts; "none" → the Unfiled (root) bucket;
  // any other value → that folder. `listPrompts`/`countPrompts` read `undefined`
  // as "no filter" and `null` as "no folder".
  const folderFilter =
    folderParam === undefined
      ? undefined
      : folderParam === "none"
        ? null
        : folderParam;

  // Resolve the active folder's name for the heading (also confirms ownership;
  // an unowned/missing id yields no name and an empty list).
  const activeFolder =
    typeof folderFilter === "string"
      ? await getFolder(user.id, folderFilter)
      : null;

  const total = await countPrompts(user.id, { folderId: folderFilter });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), pageCount);

  const prompts = await listPrompts(user.id, {
    folderId: folderFilter,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  // Folder options for the "Move to…" menu (DIG-23).
  const folderOptions = (await listFolders(user.id)).map((f) => ({
    id: f.id,
    name: f.name,
  }));

  // Serializable card shape for the client list (drag source + move menu).
  const cards: PromptCard[] = prompts.map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    folderId: p.folderId,
    shared: p.visibility === "UNLISTED",
    updatedLabel: dateFmt.format(p.updatedAt),
  }));

  // Preserve the active folder filter across pagination links.
  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (folderParam) params.set("folderId", folderParam);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/library?${qs}` : "/library";
  };

  const scopeLabel =
    folderParam === undefined
      ? null
      : folderParam === "none"
        ? "Unfiled"
        : (activeFolder?.name ?? "Folder");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {scopeLabel ?? "Your library"}
          </h1>
          <p className="text-foreground/60 flex items-center gap-2 text-sm">
            <span>
              {total} {total === 1 ? "prompt" : "prompts"}
            </span>
            {scopeLabel ? (
              <Link
                href="/library"
                className="underline underline-offset-4 hover:no-underline"
              >
                Clear filter
              </Link>
            ) : null}
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
            {scopeLabel
              ? `No prompts in ${scopeLabel}.`
              : "No prompts yet. Create your first one to get started."}
          </p>
          <Link
            href="/library/new"
            className="text-sm font-medium underline underline-offset-4"
          >
            New prompt →
          </Link>
        </div>
      ) : (
        <PromptList prompts={cards} folders={folderOptions} />
      )}

      {pageCount > 1 ? (
        <nav className="flex items-center justify-between pt-2 text-sm">
          {page > 1 ? (
            <Link
              href={hrefForPage(page - 1)}
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
              href={hrefForPage(page + 1)}
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
