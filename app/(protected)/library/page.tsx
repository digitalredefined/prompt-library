import { cookies } from "next/headers";
import Link from "next/link";

import { LibraryFilters } from "@/components/library-filters";
import { LibrarySearch } from "@/components/library-search";
import { LibrarySort } from "@/components/library-sort";
import { PromptList, type PromptCard } from "@/components/prompt-list";
import { Button } from "@/components/ui/button";
import { listCategories } from "@/lib/categories";
import { listFolders } from "@/lib/folders";
import {
  countPrompts,
  DEFAULT_SORT,
  listPromptsWithLabels,
  parseSort,
} from "@/lib/prompts";
import { listTags } from "@/lib/tags";
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

/** Normalize a repeatable search param to a string array. */
function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    folderId?: string;
    categoryId?: string | string[];
    tag?: string | string[];
    q?: string;
    sort?: string;
    fav?: string;
  }>;
}) {
  const user = await requireUser("/library");
  const {
    page: pageParam,
    folderId: folderParam,
    categoryId: categoryParam,
    tag: tagParam,
    q: queryParam,
    sort: sortParam,
    fav: favParam,
  } = await searchParams;

  // `folderId` absent → all folders; "none" → the Unfiled (root) bucket; any
  // other value → that folder. Category/tag filters are repeatable and combine
  // with the folder (and each other) as AND — see `buildPromptWhere`/DIG-26.
  const folderFilter =
    folderParam === undefined
      ? undefined
      : folderParam === "none"
        ? null
        : folderParam;
  const categoryIds = toArray(categoryParam);
  const tagIds = toArray(tagParam);
  const query = queryParam?.trim() || undefined;
  const favorite = favParam === "1";
  const filter = {
    folderId: folderFilter,
    categoryIds,
    tagIds,
    query,
    favorite,
  };

  // Sort resolution (DIG-28): explicit `sort` param wins; otherwise fall back to
  // the last-used sort remembered in the `library_sort` cookie; else the default.
  const sort =
    parseSort(sortParam) ??
    parseSort((await cookies()).get("library_sort")?.value) ??
    DEFAULT_SORT;
  const filtersActive =
    folderParam !== undefined ||
    categoryIds.length > 0 ||
    tagIds.length > 0 ||
    query !== undefined ||
    favorite;

  const [folders, categories, tags] = await Promise.all([
    listFolders(user.id),
    listCategories(user.id),
    listTags(user.id),
  ]);

  const total = await countPrompts(user.id, filter);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), pageCount);

  const prompts = await listPromptsWithLabels(user.id, {
    ...filter,
    sort,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const folderOptions = folders.map((f) => ({ id: f.id, name: f.name }));

  // Serializable card shape for the client list (drag source + move menu).
  const cards: PromptCard[] = prompts.map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    folderId: p.folderId,
    shared: p.visibility === "UNLISTED",
    favorite: p.favorite,
    updatedLabel: dateFmt.format(p.updatedAt),
    categories: p.categories.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
    })),
    tags: p.tags.map((t) => ({ id: t.id, name: t.name })),
  }));

  // Preserve every active filter across pagination links.
  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (folderParam) params.set("folderId", folderParam);
    for (const id of categoryIds) params.append("categoryId", id);
    for (const id of tagIds) params.append("tag", id);
    if (query) params.set("q", query);
    if (sort !== DEFAULT_SORT) params.set("sort", sort);
    if (favorite) params.set("fav", "1");
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/library?${qs}` : "/library";
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Your library</h1>
          <p className="text-foreground/60 text-sm">
            {total} {total === 1 ? "prompt" : "prompts"}
            {filtersActive
              ? total === 1
                ? " matches your filters"
                : " match your filters"
              : ""}
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/library/new">New prompt</Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <LibrarySearch />
        </div>
        <LibrarySort value={sort} />
      </div>

      <LibraryFilters
        folders={folderOptions}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
        }))}
        tags={tags.map((t) => ({ id: t.id, name: t.name }))}
      />

      {total === 0 ? (
        <div className="border-foreground/10 bg-foreground/[0.03] flex flex-col items-start gap-3 rounded-lg border p-6">
          <p className="text-foreground/70 text-sm">
            {filtersActive
              ? "No prompts match these filters."
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
        <PromptList prompts={cards} folders={folderOptions} query={query} />
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
